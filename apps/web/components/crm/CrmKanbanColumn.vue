<template>
  <div
    class="crm-kanban-column flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border shadow-lg ring-1 ring-white/[0.03] transition"
    :class="[
      theme.column,
      { 'opacity-50 ring-2 ring-blue-400/40': columnDragging },
      { 'ring-2 ring-blue-400/50': columnDropTarget },
    ]"
    @dragover="onColumnDragOver"
    @dragleave="onColumnDragLeave"
    @drop="onColumnDrop"
  >
    <div class="border-b px-3 py-3" :class="theme.header">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <button
              v-if="reorderable"
              type="button"
              class="shrink-0 cursor-grab rounded px-0.5 text-slate-500 hover:bg-slate-800/80 hover:text-slate-300 active:cursor-grabbing"
              title="Drag to reorder column"
              draggable="true"
              @dragstart="onColumnDragStart"
              @dragend="onColumnDragEnd"
              @click.stop
            >
              <span class="block text-xs leading-none tracking-tighter" aria-hidden="true">⋮⋮</span>
              <span class="sr-only">Reorder column</span>
            </button>
            <span
              v-else
              class="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
              :class="theme.dot"
              aria-hidden="true"
            />
            <span
              v-if="reorderable"
              class="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
              :class="theme.dot"
              aria-hidden="true"
            />
            <input
              v-if="editableTitle && renaming"
              ref="renameInput"
              v-model="renameValue"
              class="w-full rounded border border-slate-600 bg-slate-950/80 px-2 py-1 text-sm font-semibold text-white outline-none ring-1 ring-blue-500/40"
              @keydown.enter.prevent="commitRename"
              @keydown.escape.prevent="cancelRename"
              @blur="commitRename"
            />
            <button
              v-else-if="editableTitle"
              type="button"
              class="truncate text-left text-sm font-semibold tracking-tight text-white hover:text-blue-200"
              title="Rename column"
              @click="startRename"
            >
              {{ title }}
            </button>
            <h3 v-else class="truncate text-sm font-semibold tracking-tight text-white">{{ title }}</h3>
          </div>
          <p class="mt-1 pl-[1.125rem] text-xs font-medium" :class="theme.count">{{ items.length }} {{ label }}</p>
        </div>
        <button
          v-if="canDelete"
          type="button"
          class="shrink-0 rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-800 hover:text-rose-300"
          title="Delete column"
          @click="$emit('delete-column', stage)"
        >
          ✕
        </button>
      </div>
    </div>
    <div
      class="flex-1 space-y-2.5 overflow-y-auto p-3"
      :class="{ 'min-h-[220px]': items.length === 0 }"
      @dragover.prevent="onCardDragOver"
      @drop.prevent="onCardDrop"
    >
      <p
        v-if="items.length === 0"
        class="rounded-lg border border-dashed border-slate-600/60 px-3 py-8 text-center text-xs text-slate-500"
      >
        Drop leads here
      </p>
      <div
        v-for="item in items"
        :key="itemId(item)"
        class="crm-kanban-card group cursor-grab rounded-lg border border-slate-700/60 border-l-[3px] bg-slate-950/70 p-3 shadow-md transition hover:border-slate-600 hover:bg-slate-900/90 hover:shadow-lg active:cursor-grabbing"
        :class="theme.cardAccent"
        draggable="true"
        @dragstart="onCardDragStart($event, item)"
      >
        <slot name="item" :item="item" :theme="theme">
          <p class="font-medium text-white">{{ itemTitle(item) }}</p>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { crmStageTheme } from '~/utils/crmPipelineStage'

const COLUMN_MIME = 'application/x-crm-column'
const LEAD_MIME = 'application/x-crm-lead'

const props = withDefaults(
  defineProps<{
    title: string
    items: unknown[]
    stage: string
    stageId?: string
    itemId: (item: unknown) => string
    itemTitle: (item: unknown) => string
    label?: string
    editableTitle?: boolean
    canDelete?: boolean
    reorderable?: boolean
    themeIndex?: number
  }>(),
  {
    label: 'cards',
    editableTitle: false,
    canDelete: false,
    reorderable: false,
    themeIndex: 0,
    stageId: '',
  },
)

const emit = defineEmits<{
  drop: [itemOrId: unknown, stage: string]
  rename: [stage: string, title: string]
  'delete-column': [stage: string]
  'column-drop': [fromStageId: string, toStageId: string]
}>()

const theme = computed(() => crmStageTheme(props.stage, props.themeIndex))

const renaming = ref(false)
const renameValue = ref('')
const renameInput = ref<HTMLInputElement | null>(null)
const columnDragging = ref(false)
const columnDropTarget = ref(false)
let renameCommitted = false

function startRename() {
  renaming.value = true
  renameValue.value = props.title
  renameCommitted = false
  nextTick(() => renameInput.value?.focus())
}

function cancelRename() {
  renaming.value = false
  renameValue.value = props.title
}

function commitRename() {
  if (renameCommitted) return
  renameCommitted = true
  const next = renameValue.value.trim()
  renaming.value = false
  if (!next || next === props.title) {
    renameValue.value = props.title
    return
  }
  emit('rename', props.stage, next)
}

function onCardDragStart(e: DragEvent, item: unknown) {
  const id = props.itemId(item as { id: string })
  e.dataTransfer?.setData(LEAD_MIME, id)
  e.dataTransfer?.setData('text/plain', id)
  e.dataTransfer!.effectAllowed = 'move'
}

function onCardDragOver(e: DragEvent) {
  if (e.dataTransfer?.types.includes(COLUMN_MIME)) return
  e.dataTransfer!.dropEffect = 'move'
}

function onCardDrop(e: DragEvent) {
  if (e.dataTransfer?.types.includes(COLUMN_MIME)) return
  const id = e.dataTransfer?.getData(LEAD_MIME) || e.dataTransfer?.getData('text/plain')
  if (id) emit('drop', id, props.stage)
}

function onColumnDragStart(e: DragEvent) {
  if (!props.reorderable || !props.stageId) {
    e.preventDefault()
    return
  }
  columnDragging.value = true
  e.dataTransfer?.setData(COLUMN_MIME, props.stageId)
  e.dataTransfer?.setData('text/plain', `column:${props.stageId}`)
  e.dataTransfer!.effectAllowed = 'move'
}

function onColumnDragEnd() {
  columnDragging.value = false
  columnDropTarget.value = false
}

function isColumnDrag(e: DragEvent): boolean {
  return Boolean(e.dataTransfer?.types.includes(COLUMN_MIME))
}

function onColumnDragOver(e: DragEvent) {
  if (!props.reorderable || !props.stageId || !isColumnDrag(e)) return
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
  columnDropTarget.value = true
}

function onColumnDragLeave(e: DragEvent) {
  const related = e.relatedTarget as Node | null
  if (related && (e.currentTarget as HTMLElement).contains(related)) return
  columnDropTarget.value = false
}

function onColumnDrop(e: DragEvent) {
  columnDropTarget.value = false
  if (!props.reorderable || !props.stageId || !isColumnDrag(e)) return
  e.preventDefault()
  e.stopPropagation()
  const fromId = e.dataTransfer?.getData(COLUMN_MIME)
  if (!fromId || fromId === props.stageId) return
  emit('column-drop', fromId, props.stageId)
}
</script>
