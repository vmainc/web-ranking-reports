<script setup lang="ts">
import { useDraggable } from 'vue-draggable-plus'
import type { ReportModule } from '~/types/reportBuilder'
import ReportModuleCard from '~/components/report-builder/ReportModuleCard.vue'

const props = withDefaults(
  defineProps<{
    modelValue: ReportModule[]
    selectedId: string | null
    /** One sheet height; modules share space equally (flex); content clipped; agency mark bottom-right. */
    pageFit?: boolean
    /** Match PDF: extra top air + centered short stacks on sheets after page 1. */
    subsequentSheet?: boolean
  }>(),
  { pageFit: false, subsequentSheet: false },
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

const agencyLogoVisible = ref(true)
const agencyLogoSrc = '/api/agency/logo'

watch(
  () => [props.pageFit, props.modelValue.length] as const,
  ([fit, n]) => {
    if (fit && n > 0) agencyLogoVisible.value = true
  },
)
</script>

<template>
  <div
    class="relative rounded-2xl border border-dashed border-surface-200 bg-surface-50/40"
    :class="[
      pageFit
        ? subsequentSheet
          ? 'report-canvas--subsequent flex min-h-[18rem] max-h-[78vh] flex-col overflow-hidden box-border h-[min(72rem,78vh)] px-3 pb-3 pt-12'
          : 'flex min-h-[18rem] max-h-[78vh] flex-col overflow-hidden p-3 h-[min(72rem,78vh)]'
        : 'min-h-[320px] p-4',
    ]"
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
      class="report-canvas-page-modules relative z-20 flex flex-col"
      :class="pageFit ? 'min-h-0 flex-1 gap-3 overflow-hidden pb-10' : 'min-h-[280px] gap-4'"
    >
      <div
        v-for="m in modelValue"
        :key="m.id"
        class="report-canvas-module-slot flex min-h-0 flex-col"
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
    <div
      v-if="pageFit && modelValue.length"
      v-show="agencyLogoVisible"
      class="report-canvas-agency-mark pointer-events-none absolute bottom-0 right-0 z-30 bg-transparent px-1.5 pt-1 pb-0"
      aria-hidden="true"
    >
      <img
        :src="agencyLogoSrc"
        alt=""
        class="block h-6 max-w-[4.25rem] object-contain object-right object-bottom opacity-90"
        loading="lazy"
        @error="agencyLogoVisible = false"
      />
    </div>
  </div>
</template>

<style scoped>
/* Pages 2+ (builder sheet preview): align with PDF rhythm */
.report-canvas--subsequent .report-canvas-page-modules {
  justify-content: center;
}
.report-canvas--subsequent .report-canvas-module-slot:only-child {
  flex: 0 1 auto;
  flex-basis: auto;
}
</style>
