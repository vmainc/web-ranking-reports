<template>
  <CrmModal v-model="open" title="Convert audit to Sales lead" content-class="max-w-lg">
    <form id="convert-lead-form" class="space-y-3" @submit.prevent="submit">
      <p class="text-sm text-surface-600">
        Creates a CRM lead in the Sales pipeline (New stage) with this audit summary in the notes.
      </p>
      <div>
        <label class="block text-sm font-medium text-surface-700">Lead name</label>
        <input v-model="name" type="text" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-sm font-medium text-surface-700">Company</label>
        <input v-model="company" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-sm font-medium text-surface-700">Email <span class="font-normal text-surface-500">(optional)</span></label>
        <input v-model="email" type="email" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
      </div>
      <label class="flex items-center gap-2 text-sm text-surface-600">
        <input v-model="createBoardCard" type="checkbox" class="rounded border-surface-300" />
        Also create a board card linked to this lead
      </label>
      <div v-if="createBoardCard" class="grid gap-3 sm:grid-cols-2">
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
      </div>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm" @click="open = false">Cancel</button>
        <button
          type="submit"
          form="convert-lead-form"
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          :disabled="saving || !name.trim()"
        >
          {{ saving ? 'Converting…' : 'Convert to lead' }}
        </button>
      </div>
    </template>
  </CrmModal>
</template>

<script setup lang="ts">
import type { ProspectAudit } from '~/utils/prospectAudit'

const props = defineProps<{
  modelValue: boolean
  audit: ProspectAudit | null
  defaultName: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  converted: [payload: { clientId: string; audits: ProspectAudit[] }]
}>()

const pb = usePocketbase()
const { boards, lists, loadBoards, loadBoard } = useCrmBoards()

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const name = ref('')
const company = ref('')
const email = ref('')
const createBoardCard = ref(true)
const selectedBoardId = ref('')
const selectedListId = ref('')
const saving = ref(false)
const error = ref('')

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (!isOpen || !props.audit) return
    error.value = ''
    name.value = props.defaultName || props.audit.domain
    company.value = props.audit.domain
    email.value = ''
    createBoardCard.value = true
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
}

async function submit() {
  if (!props.audit || !name.value.trim()) return
  saving.value = true
  error.value = ''
  try {
    const res = await $fetch<{
      client: { id: string }
      audits: ProspectAudit[]
    }>(`/api/workspace/prospect-audits/${props.audit.id}/convert-lead`, {
      method: 'POST',
      headers: authHeaders(),
      body: {
        name: name.value.trim(),
        company: company.value.trim() || undefined,
        email: email.value.trim() || undefined,
        createBoardCard: createBoardCard.value,
        boardListId: createBoardCard.value ? selectedListId.value : undefined,
      },
    })
    emit('converted', { clientId: res.client.id, audits: res.audits })
    open.value = false
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Failed to convert'
  } finally {
    saving.value = false
  }
}
</script>
