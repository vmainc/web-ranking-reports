<template>
  <CrmModal v-model="open" title="Save audit to board" content-class="max-w-xl">
    <div class="space-y-4">
      <p class="text-sm text-surface-600">
        Park this prospect audit on a Workspace board card while you prepare outreach.
      </p>
      <div v-if="boardsError" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ boardsError }}</div>
      <div v-if="boardsPending && !boards.length" class="text-sm text-surface-500">Loading boards…</div>
      <template v-else>
        <div>
          <label class="block text-sm font-medium text-surface-700">Board</label>
          <select v-model="selectedBoardId" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" @change="onBoardChange">
            <option v-for="b in boards" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Column</label>
          <select v-model="selectedListId" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
            <option v-for="list in lists" :key="list.id" :value="list.id">{{ list.name }}</option>
          </select>
        </div>
        <fieldset>
          <legend class="text-sm font-medium text-surface-700">Save as</legend>
          <div class="mt-2 flex flex-wrap gap-3">
            <label class="inline-flex items-center gap-2 text-sm text-surface-700">
              <input v-model="saveMode" type="radio" value="new" class="border-surface-300 text-primary-600" />
              New card
            </label>
            <label class="inline-flex items-center gap-2 text-sm text-surface-700">
              <input v-model="saveMode" type="radio" value="existing" class="border-surface-300 text-primary-600" :disabled="!cardsInList.length" />
              Existing card
            </label>
          </div>
        </fieldset>
        <div v-if="saveMode === 'new'">
          <label class="block text-sm font-medium text-surface-700">Card title</label>
          <input v-model="cardTitle" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
        </div>
        <div v-else>
          <label class="block text-sm font-medium text-surface-700">Card</label>
          <select v-model="selectedCardId" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
            <option value="" disabled>Select a card</option>
            <option v-for="card in cardsInList" :key="card.id" :value="card.id">{{ card.title }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Notes</label>
          <textarea v-model="notesDraft" rows="8" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 font-mono text-xs" />
        </div>
        <p v-if="saveError" class="text-sm text-red-600">{{ saveError }}</p>
        <p v-if="saveMessage" class="text-sm text-emerald-700">{{ saveMessage }}</p>
      </template>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm" @click="open = false">Cancel</button>
        <button
          type="button"
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          :disabled="saving || !canSubmit"
          @click="submit"
        >
          {{ saving ? 'Saving…' : 'Save to board' }}
        </button>
      </div>
    </template>
  </CrmModal>
</template>

<script setup lang="ts">
import type { CrmBoardCard } from '~/types'
import type { ProspectAudit } from '~/utils/prospectAudit'

const props = defineProps<{
  modelValue: boolean
  audit: ProspectAudit | null
  notes: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { boards, lists, pending: boardsPending, error: boardsError, loadBoards, loadBoard, addCard, updateCard } = useCrmBoards()

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const selectedBoardId = ref('')
const selectedListId = ref('')
const selectedCardId = ref('')
const saveMode = ref<'new' | 'existing'>('new')
const cardTitle = ref('')
const notesDraft = ref('')
const saving = ref(false)
const saveError = ref('')
const saveMessage = ref('')

const cardsInList = computed(() => {
  const list = lists.value.find((l) => l.id === selectedListId.value)
  return (list?.cards || []) as CrmBoardCard[]
})

const canSubmit = computed(() => {
  if (!selectedListId.value || !notesDraft.value.trim()) return false
  if (saveMode.value === 'new') return Boolean(cardTitle.value.trim())
  return Boolean(selectedCardId.value)
})

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (!isOpen) return
    saveError.value = ''
    saveMessage.value = ''
    saveMode.value = 'new'
    selectedCardId.value = ''
    cardTitle.value = props.audit?.domain || 'Prospect audit'
    notesDraft.value = props.notes || ''
    await loadBoards()
    selectedBoardId.value = boards.value.find((b) => b.is_default)?.id || boards.value[0]?.id || ''
    if (selectedBoardId.value) {
      await loadBoard(selectedBoardId.value)
      selectedListId.value = lists.value[0]?.id || ''
    }
  },
)

async function onBoardChange() {
  if (!selectedBoardId.value) return
  await loadBoard(selectedBoardId.value)
  selectedListId.value = lists.value[0]?.id || ''
  selectedCardId.value = ''
}

async function submit() {
  if (!canSubmit.value) return
  saving.value = true
  saveError.value = ''
  saveMessage.value = ''
  try {
    if (saveMode.value === 'new') {
      await addCard(selectedListId.value, {
        title: cardTitle.value.trim(),
        description: notesDraft.value.trim(),
      })
      saveMessage.value = 'Created board card.'
    } else {
      const card = cardsInList.value.find((c) => c.id === selectedCardId.value)
      if (!card) throw new Error('Select a card')
      const existing = (card.description || '').trim()
      const next = existing ? `${existing}\n\n———\n\n${notesDraft.value.trim()}` : notesDraft.value.trim()
      await updateCard(card.id, { description: next })
      saveMessage.value = `Added audit notes to “${card.title}”.`
    }
    setTimeout(() => {
      open.value = false
    }, 700)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    saveError.value = err?.data?.message ?? err?.message ?? 'Failed to save'
  } finally {
    saving.value = false
  }
}
</script>
