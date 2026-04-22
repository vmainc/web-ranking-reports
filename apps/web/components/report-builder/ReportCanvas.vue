<script setup lang="ts">
import { useDraggable } from 'vue-draggable-plus'
import type { ReportModule } from '~/types/reportBuilder'
import ReportModuleCard from '~/components/report-builder/ReportModuleCard.vue'

const props = defineProps<{
  modelValue: ReportModule[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ReportModule[]]
  select: [id: string | null]
  edit: [id: string]
  duplicate: [id: string]
  remove: [id: string]
}>()

const listEl = ref<HTMLElement | null>(null)

const listProxy = computed({
  get: () => props.modelValue,
  set: (v: ReportModule[]) => emit('update:modelValue', v),
})

useDraggable(listEl, listProxy, {
  handle: '.module-drag-handle',
  animation: 200,
  group: 'reportModules',
  ghostClass: 'opacity-50',
})
</script>

<template>
  <div class="relative min-h-[320px] rounded-2xl border border-dashed border-surface-200 bg-surface-50/40 p-4">
    <div
      v-if="!modelValue.length"
      class="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-6 text-center"
    >
      <p class="text-sm font-medium text-surface-700">Start building your report</p>
      <p class="max-w-sm text-xs leading-relaxed text-surface-500">
        Drag modules from the library into this canvas, or use <strong>Add</strong> on any module type. Reorder blocks with the grip handle.
      </p>
    </div>
    <div
      ref="listEl"
      class="relative z-20 flex min-h-[280px] flex-col gap-4"
    >
      <ReportModuleCard
        v-for="m in modelValue"
        :key="m.id"
        :module="m"
        :selected="selectedId === m.id"
        @select="emit('select', m.id)"
        @edit="emit('edit', m.id)"
        @duplicate="emit('duplicate', m.id)"
        @remove="emit('remove', m.id)"
      />
    </div>
  </div>
</template>
