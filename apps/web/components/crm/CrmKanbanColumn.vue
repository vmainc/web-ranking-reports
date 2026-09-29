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
      @dragover.prevent="onDragOver"
      @drop.prevent="onDrop"
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
        @dragstart="onDragStart($event, item)"
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

const props = withDefaults(
  defineProps<{
    title: string
    items: unknown[]
    stage: string
    itemId: (item: unknown) => string
    itemTitle: (item: unknown) => string
    label?: string
    editableTitle?: boolean
    canDelete?: boolean
    themeIndex?: number
  }>(),
  {
    label: 'cards',
    editableTitle: false,
    canDelete: false,
    themeIndex: 0,
  },
)

const emit = defineEmits<{
  drop: [itemOrId: unknown, stage: string]
  rename: [stage: string, title: string]
  'delete-column': [stage: string]
}>()

const theme = computed(() => crmStageTheme(props.stage, props.themeIndex))

const renaming = ref(false)
const renameValue = ref('')
const renameInput = ref<HTMLInputElement | null>(null)
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

function onDragStart(e: DragEvent, item: unknown) {
  e.dataTransfer?.setData('text/plain', props.itemId(item as { id: string }))
  e.dataTransfer!.effectAllowed = 'move'
}

function onDragOver(e: DragEvent) {
  e.dataTransfer!.dropEffect = 'move'
}

function onDrop(e: DragEvent) {
  const id = e.dataTransfer?.getData('text/plain')
  if (id) emit('drop', id, props.stage)
}
</script>
