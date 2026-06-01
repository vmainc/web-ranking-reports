<script setup lang="ts">
import Sortable from 'sortablejs'
import type { ReportPage } from '~/types/reportBuilder'

const props = defineProps<{
  modelValue: ReportPage[]
}>()

const emit = defineEmits<{
  'update:modelValue': [pages: ReportPage[]]
  dragStart: []
  dragEnd: []
}>()

const rootEl = ref<HTMLElement | null>(null)
let sortable: Sortable | null = null

function orderFromDom(): ReportPage[] {
  if (!rootEl.value) return props.modelValue
  const byId = new Map(props.modelValue.map((p) => [p.id, p]))
  const ids = Array.from(rootEl.value.querySelectorAll<HTMLElement>('[data-page-id]'))
    .map((el) => el.dataset.pageId)
    .filter((id): id is string => Boolean(id))
  return ids.map((id) => byId.get(id)).filter((p): p is ReportPage => !!p)
}

function mountSortable() {
  if (!import.meta.client) return
  const el = rootEl.value
  if (!el) return
  sortable?.destroy()
  sortable = Sortable.create(el, {
    handle: '.page-drag-handle',
    draggable: '[data-page-id]',
    animation: 200,
    ghostClass: 'opacity-50',
    onStart: () => emit('dragStart'),
    onEnd: () => {
      emit('update:modelValue', orderFromDom())
      emit('dragEnd')
    },
  })
}

onMounted(() => {
  nextTick(mountSortable)
})

watch(
  () => props.modelValue.map((p) => p.id).join(','),
  () => nextTick(mountSortable),
)

onUnmounted(() => {
  sortable?.destroy()
  sortable = null
})
</script>

<template>
  <div ref="rootEl" class="space-y-5">
    <slot />
  </div>
</template>
