<template>
  <div class="flex w-72 shrink-0 flex-col rounded-xl border border-surface-200 bg-surface-50/50">
    <div class="border-b border-surface-200 px-4 py-3">
      <h3 class="text-sm font-semibold text-surface-900">{{ title }}</h3>
      <p class="mt-0.5 text-xs text-surface-500">{{ items.length }} {{ label }}</p>
    </div>
    <div
      class="flex-1 space-y-2 overflow-y-auto p-3"
      :class="{ 'min-h-[200px]': items.length === 0 }"
      @dragover.prevent="onDragOver"
      @drop.prevent="onDrop"
    >
      <div
        v-for="item in items"
        :key="itemId(item)"
        class="cursor-grab rounded-lg border border-surface-200 bg-white p-3 shadow-sm transition hover:shadow"
        draggable="true"
        @dragstart="onDragStart($event, item)"
      >
        <slot name="item" :item="item">
          <p class="font-medium text-surface-900">{{ itemTitle(item) }}</p>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string
  items: unknown[]
  stage: string
  itemId: (item: unknown) => string
  itemTitle: (item: unknown) => string
  label?: string
}>()

const emit = defineEmits<{ drop: [itemOrId: unknown, stage: string] }>()

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
