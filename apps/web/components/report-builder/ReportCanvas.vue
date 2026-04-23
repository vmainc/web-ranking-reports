<script setup lang="ts">
import { useDraggable } from 'vue-draggable-plus'
import type { ReportModule } from '~/types/reportBuilder'
import ReportModuleCard from '~/components/report-builder/ReportModuleCard.vue'

const props = withDefaults(
  defineProps<{
    modelValue: ReportModule[]
    selectedId: string | null
    /** One sheet height; modules share space equally (flex) with internal scroll. */
    pageFit?: boolean
  }>(),
  { pageFit: false },
)

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
  <div
    class="relative rounded-2xl border border-dashed border-surface-200 bg-surface-50/40"
    :class="
      pageFit
        ? 'flex min-h-[18rem] max-h-[78vh] flex-col overflow-hidden p-3 h-[min(72rem,78vh)]'
        : 'min-h-[320px] p-4'
    "
  >
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
      class="relative z-20 flex flex-col"
      :class="pageFit ? 'min-h-0 flex-1 gap-3 overflow-hidden' : 'min-h-[280px] gap-4'"
    >
      <div
        v-for="m in modelValue"
        :key="m.id"
        class="flex min-h-0 flex-col"
        :class="pageFit ? 'flex-1 basis-0 overflow-hidden' : ''"
      >
        <ReportModuleCard
          :module="m"
          :selected="selectedId === m.id"
          :page-slot="pageFit"
          @select="emit('select', m.id)"
          @edit="emit('edit', m.id)"
          @duplicate="emit('duplicate', m.id)"
          @remove="emit('remove', m.id)"
        />
      </div>
    </div>
  </div>
</template>
