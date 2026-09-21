<template>
  <div
    class="crm-kanban-column flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border shadow-lg ring-1 ring-white/[0.03]"
    :class="theme.column"
  >
    <div class="border-b px-3 py-3" :class="theme.header">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm" :class="theme.dot" aria-hidden="true" />
            <input
              v-if="renaming"
              ref="renameInput"
              v-model="renameValue"
              class="w-full rounded border border-slate-600 bg-slate-950/80 px-2 py-1 text-sm font-semibold text-white outline-none ring-1 ring-blue-500/40"
              @keydown.enter.prevent="commitRename"
              @keydown.escape.prevent="cancelRename"
              @blur="commitRename"
            />
            <button
              v-else
              type="button"
              class="truncate text-left text-sm font-semibold tracking-tight text-white hover:text-blue-200"
              @click="startRename"
            >
              {{ list.name }}
            </button>
          </div>
          <p class="mt-1 pl-[1.125rem] text-xs font-medium" :class="theme.count">
            {{ list.cards?.length || 0 }} cards
          </p>
        </div>
        <button
          v-if="canDelete"
          type="button"
          class="shrink-0 rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-800 hover:text-rose-300"
          title="Delete column"
          @click="$emit('delete-list', list.id)"
        >
          ✕
        </button>
      </div>
    </div>

    <div
      class="flex-1 space-y-2.5 overflow-y-auto p-3"
      :class="{ 'min-h-[180px]': !(list.cards?.length) }"
      @dragover.prevent="onDragOver"
      @drop.prevent="onDrop"
    >
      <p
        v-if="!(list.cards?.length)"
        class="rounded-lg border border-dashed border-slate-600/60 px-3 py-8 text-center text-xs text-slate-500"
      >
        Drop cards here
      </p>
      <div
        v-for="card in list.cards || []"
        :key="card.id"
        class="crm-kanban-card group cursor-grab rounded-lg border border-slate-700/60 border-l-[3px] bg-slate-950/70 p-3 shadow-md transition hover:border-slate-600 hover:bg-slate-900/90 hover:shadow-lg active:cursor-grabbing"
        :class="theme.cardAccent"
        draggable="true"
        @dragstart="onDragStart($event, card)"
        @click="$emit('open-card', card)"
      >
        <p class="font-semibold text-white transition group-hover:text-blue-300">{{ card.title }}</p>
        <p v-if="card.expand?.client?.company" class="mt-0.5 truncate text-xs text-slate-400">
          {{ card.expand.client.company }}
        </p>
        <p v-else-if="card.description" class="mt-1 line-clamp-2 text-xs text-slate-400">{{ card.description }}</p>
        <div v-if="cardMeta(card).length" class="mt-2 flex flex-wrap gap-1">
          <span
            v-for="tag in cardMeta(card)"
            :key="tag"
            class="inline-flex max-w-full truncate rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
            :class="theme.chip"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </div>

    <div class="border-t border-slate-700/50 p-3">
      <form v-if="adding" class="space-y-2" @submit.prevent="submitCard">
        <textarea
          ref="cardInput"
          v-model="cardTitle"
          rows="2"
          class="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none ring-1 ring-blue-500/30 placeholder:text-slate-500"
          placeholder="Card title"
          @keydown.enter.exact.prevent="submitCard"
          @keydown.escape.prevent="cancelAdd"
        />
        <label class="flex items-center gap-2 text-xs text-slate-400">
          <input v-model="createContact" type="checkbox" class="rounded border-slate-600" />
          Also create as CRM contact
        </label>
        <div class="flex gap-2">
          <button
            type="submit"
            class="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-500 disabled:opacity-60"
            :disabled="!cardTitle.trim() || saving"
          >
            {{ saving ? 'Adding…' : 'Add card' }}
          </button>
          <button type="button" class="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-white" @click="cancelAdd">
            Cancel
          </button>
        </div>
      </form>
      <button
        v-else
        type="button"
        class="w-full rounded-lg border border-dashed border-slate-600/70 px-3 py-2 text-left text-xs font-medium text-slate-400 transition hover:border-slate-500 hover:bg-slate-900/60 hover:text-slate-200"
        @click="startAdd"
      >
        + Add a card
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CrmBoardCard, CrmBoardList } from '~/types'
import { crmBoardListTheme } from '~/utils/crmBoardTheme'

const props = defineProps<{
  list: CrmBoardList
  themeIndex: number
  canDelete?: boolean
}>()

const emit = defineEmits<{
  drop: [cardId: string, listId: string]
  'add-card': [payload: { title: string; create_contact: boolean }]
  'rename-list': [listId: string, name: string]
  'delete-list': [listId: string]
  'open-card': [card: CrmBoardCard]
}>()

const theme = computed(() => crmBoardListTheme(props.themeIndex))
const renaming = ref(false)
const renameValue = ref('')
const renameInput = ref<HTMLInputElement | null>(null)
const adding = ref(false)
const cardTitle = ref('')
const createContact = ref(true)
const cardInput = ref<HTMLTextAreaElement | null>(null)
const saving = ref(false)

function cardMeta(card: CrmBoardCard): string[] {
  const tags: string[] = []
  const c = card.expand?.client
  if (c?.source?.trim()) tags.push(c.source.trim())
  if (c?.next_step?.trim()) tags.push(c.next_step.trim())
  if (!c && card.client) tags.push('Linked contact')
  return tags.slice(0, 2)
}

function startRename() {
  renameValue.value = props.list.name
  renaming.value = true
  nextTick(() => renameInput.value?.focus())
}

function cancelRename() {
  renaming.value = false
}

function commitRename() {
  if (!renaming.value) return
  const name = renameValue.value.trim()
  renaming.value = false
  if (!name || name === props.list.name) return
  emit('rename-list', props.list.id, name)
}

function startAdd() {
  adding.value = true
  cardTitle.value = ''
  createContact.value = true
  nextTick(() => cardInput.value?.focus())
}

function cancelAdd() {
  adding.value = false
  cardTitle.value = ''
  saving.value = false
}

async function submitCard() {
  const title = cardTitle.value.trim()
  if (!title || saving.value) return
  saving.value = true
  try {
    emit('add-card', { title, create_contact: createContact.value })
    adding.value = false
    cardTitle.value = ''
  } finally {
    saving.value = false
  }
}

function onDragStart(e: DragEvent, card: CrmBoardCard) {
  e.dataTransfer?.setData('text/plain', card.id)
  e.dataTransfer!.effectAllowed = 'move'
}

function onDragOver(e: DragEvent) {
  e.dataTransfer!.dropEffect = 'move'
}

function onDrop(e: DragEvent) {
  const id = e.dataTransfer?.getData('text/plain')
  if (id) emit('drop', id, props.list.id)
}
</script>
