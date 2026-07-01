<script setup lang="ts">
import type { ReportBuilderModel } from '~/types/reportBuilder'
import { REPORT_DATE_RANGE_OPTIONS, formatDateRangeSpan } from '~/utils/dateRange'

const props = defineProps<{
  model: ReportBuilderModel
  compact?: boolean
  /** Compact controls embedded in the dark builder toolbar. */
  toolbar?: boolean
}>()

const emit = defineEmits<{
  update: [patch: ReportBuilderModel['dateRange']]
}>()

const spanLabel = computed(() => formatDateRangeSpan(props.model.dateRange.rangePreset))

function onPresetChange(event: Event) {
  const rangePreset = (event.target as HTMLSelectElement).value
  emit('update', { ...props.model.dateRange, rangePreset })
}

function onCompareChange(event: Event) {
  emit('update', {
    ...props.model.dateRange,
    compareToPrevious: (event.target as HTMLInputElement).checked,
  })
}
</script>

<template>
  <div
    class="flex flex-wrap items-end gap-x-4 gap-y-2"
    :class="
      compact
        ? ''
        : 'rounded-lg border border-surface-200 bg-surface-50/80 p-3'
    "
  >
    <label class="block min-w-[10rem] flex-1">
      <span
        class="text-xs font-medium"
        :class="toolbar ? 'text-slate-300' : 'text-surface-700'"
      >Reporting period</span>
      <select
        :value="model.dateRange.rangePreset"
        class="mt-1 w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        :class="toolbar ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-surface-200 bg-white'"
        @change="onPresetChange"
      >
        <option v-for="o in REPORT_DATE_RANGE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <p class="mt-1 text-[11px]" :class="toolbar ? 'text-slate-400' : 'text-surface-500'">{{ spanLabel }}</p>
    </label>
    <label class="flex cursor-pointer items-center gap-2 pb-1">
      <input
        :checked="model.dateRange.compareToPrevious"
        type="checkbox"
        class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
        @change="onCompareChange"
      />
      <span class="text-sm" :class="toolbar ? 'text-slate-200' : 'text-surface-800'">Compare to previous period</span>
    </label>
    <p v-if="!compact" class="w-full text-[11px] leading-snug text-surface-500">
      Every dated block in this report uses this period — Analytics, Ads, Search Console, WooCommerce, and more.
    </p>
  </div>
</template>
