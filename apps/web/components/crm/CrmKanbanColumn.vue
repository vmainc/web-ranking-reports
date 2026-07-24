<template>
  <div
    class="crm-kanban-column flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border shadow-lg ring-1 ring-white/[0.03]"
    :class="theme.column"
  >
    <div class="border-b px-4 py-3" :class="theme.header">
      <div class="flex items-center gap-2">
        <span class="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm" :class="theme.dot" aria-hidden="true" />
        <h3 class="text-sm font-semibold tracking-tight text-white">{{ title }}</h3>
      </div>
      <p class="mt-1 pl-[1.125rem] text-xs font-medium" :class="countClass">{{ items.length }} {{ label }}</p>
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

const props = defineProps<{
  title: string
  items: unknown[]
  stage: string
  itemId: (item: unknown) => string
  itemTitle: (item: unknown) => string
  label?: string
}>()

const emit = defineEmits<{ drop: [itemOrId: unknown, stage: string] }>()

const theme = computed(() => crmStageTheme(props.stage))

const countClass = computed(() => {
  const s = props.stage
  if (s === 'won') return 'text-emerald-400/90'
  if (s === 'lost') return 'text-rose-400/80'
  if (s === 'proposal') return 'text-amber-400/90'
  return 'text-slate-400'
})

let draggedItem: unknown = null

function onDragStart(e: DragEvent, item: unknown) {
  draggedItem = item
  e.dataTransfer?.setData('text/plain', props.itemId(item as { id: string }))
  e.dataTransfer!.effectAllowed = 'move'
}

function onDragOver(e: DragEvent) {
  e.dataTransfer!.dropEffect = 'move'
}

function onDrop(e: DragEvent) {
  const id = e.dataTransfer?.getData('text/plain')
  if (id) {
    emit('drop', id, props.stage)
  }
  draggedItem = null
}

</script>
