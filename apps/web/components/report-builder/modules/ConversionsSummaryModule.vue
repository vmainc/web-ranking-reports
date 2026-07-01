<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'
import { formatDateRangeSpan } from '~/utils/dateRange'

defineProps<{
  module: Extract<ReportModule, { type: 'conversions_summary' }>
}>()

const { rangePreset, compareToPrevious } = useReportDateRange()
const rangeLabel = computed(() => formatDateRangeSpan(rangePreset.value))
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-6">
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-wide text-surface-500">Conversions</p>
        <p class="text-2xl font-bold text-surface-900">842</p>
        <p v-if="compareToPrevious" class="text-xs text-emerald-600">+12.4% vs prior period</p>
      </div>
      <div v-if="module.settings.showConversionValue">
        <p class="text-[10px] font-semibold uppercase tracking-wide text-surface-500">Value</p>
        <p class="text-2xl font-bold text-surface-900">$24,600</p>
        <p class="text-xs text-surface-500">Attributed revenue (demo)</p>
      </div>
    </div>
    <div
      v-if="module.settings.showSourceBreakdown"
      class="grid gap-2 rounded-lg border border-surface-100 bg-surface-50/80 p-3 sm:grid-cols-3"
    >
      <div v-for="s in ['Organic', 'Paid', 'Direct']" :key="s" class="text-center">
        <p class="text-xs font-medium text-surface-600">{{ s }}</p>
        <p class="text-sm font-semibold text-surface-900">—</p>
      </div>
    </div>
    <p class="text-xs text-surface-500">{{ rangeLabel }}</p>
  </div>
</template>
