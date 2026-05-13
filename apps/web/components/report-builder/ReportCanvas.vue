<script setup lang="ts">
import { useDraggable } from 'vue-draggable-plus'
import type { LibraryCatalogItem, ReportModule } from '~/types/reportBuilder'
import ReportModuleCard from '~/components/report-builder/ReportModuleCard.vue'
import ReportCanvasModulePicker from '~/components/report-builder/ReportCanvasModulePicker.vue'

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
  'library-add': [item: LibraryCatalogItem]
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
const { agencyLogoImgSrc } = useAgencyLogoImgSrc()

watch(
  () => [props.pageFit, props.modelValue.length] as const,
  ([fit, n]) => {
    if (fit && n > 0) agencyLogoVisible.value = true
  },
)

/** Inline module library when the page already has blocks */
const addPickerOpen = ref(false)
const addPickerKey = ref(0)

watch(
  () => props.modelValue.length,
  (n) => {
    if (n === 0) {
      addPickerOpen.value = false
      addPickerKey.value += 1
    }
  },
)

function onLibraryPick(item: LibraryCatalogItem) {
  emit('library-add', item)
  addPickerOpen.value = false
  addPickerKey.value += 1
}

</script>

<template>
  <div
    class="relative rounded-2xl border border-dashed border-surface-200 bg-surface-50/40"
    :class="[
      pageFit
        ? subsequentSheet
          ? 'report-canvas--subsequent flex min-h-[18rem] max-h-[88vh] flex-col overflow-hidden box-border h-[min(84rem,88vh)] p-3'
          : 'flex min-h-[18rem] max-h-[88vh] flex-col overflow-hidden box-border h-[min(84rem,88vh)] p-3'
        : 'min-h-[320px] p-4',
    ]"
  >
    <div
      v-if="pageFit && !modelValue.length"
      class="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <ReportCanvasModulePicker @add="emit('library-add', $event)" />
    </div>
    <div
      v-else-if="!pageFit && !modelValue.length"
      class="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-6 text-center"
    >
      <p class="text-sm font-medium text-surface-700">Start building your report</p>
      <p class="max-w-sm text-xs leading-relaxed text-surface-500">Add blocks from the library, then reorder with the grip handle.</p>
    </div>
    <div
      v-show="modelValue.length > 0"
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
    <template v-if="pageFit && modelValue.length">
      <!-- pr-* clears the bottom-right agency mark so “+ Add module” doesn’t crowd the logo -->
      <div class="relative z-20 mt-2 flex shrink-0 flex-col gap-2 border-t border-surface-200/80 pt-2 pr-[5.25rem] sm:pr-24">
        <button
          type="button"
          class="inline-flex w-full items-center justify-center rounded-lg border border-dashed border-surface-300 bg-white/80 px-3 py-2 text-xs font-semibold text-surface-700 shadow-sm hover:border-primary-300 hover:bg-primary-50/50 hover:text-primary-800"
          @click="addPickerOpen = !addPickerOpen"
        >
          {{ addPickerOpen ? 'Close module picker' : '+ Add module' }}
        </button>
        <div v-if="addPickerOpen" class="max-h-[min(28rem,42vh)] min-h-[12rem] shrink-0 overflow-hidden rounded-xl border border-surface-200 bg-surface-50/40">
          <ReportCanvasModulePicker :key="addPickerKey" variant="inline" class="h-full min-h-0" @add="onLibraryPick" />
        </div>
      </div>
    </template>
    <div
      v-if="pageFit && modelValue.length"
      v-show="agencyLogoVisible"
      class="report-canvas-agency-mark pointer-events-none absolute bottom-0 right-0 z-30 bg-transparent px-1.5 pt-1 pb-0"
      aria-hidden="true"
    >
      <img
        :src="agencyLogoImgSrc"
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
  justify-content: flex-start;
  padding-top: 0;
}
</style>
