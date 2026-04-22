<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'

defineProps<{
  module: Extract<ReportModule, { type: 'traffic_overview' }>
}>()
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-3 gap-3 sm:grid-cols-4">
      <div class="rounded-lg border border-surface-100 bg-white px-3 py-2 shadow-sm">
        <p class="text-[10px] font-medium uppercase tracking-wide text-surface-500">Sessions</p>
        <p class="text-lg font-semibold text-surface-900">12.4k</p>
        <p class="text-xs text-emerald-600">+8.2% vs prior</p>
      </div>
      <div class="rounded-lg border border-surface-100 bg-white px-3 py-2 shadow-sm">
        <p class="text-[10px] font-medium uppercase tracking-wide text-surface-500">Users</p>
        <p class="text-lg font-semibold text-surface-900">9.1k</p>
        <p class="text-xs text-emerald-600">+5.1%</p>
      </div>
      <div class="rounded-lg border border-surface-100 bg-white px-3 py-2 shadow-sm">
        <p class="text-[10px] font-medium uppercase tracking-wide text-surface-500">Engagement</p>
        <p class="text-lg font-semibold text-surface-900">2m 14s</p>
        <p class="text-xs text-surface-500">avg session</p>
      </div>
    </div>
    <div
      v-if="module.settings.showChart"
      class="flex h-36 items-center justify-center rounded-xl border border-dashed border-surface-200 bg-gradient-to-b from-surface-50 to-white text-sm text-surface-500"
    >
      Line chart preview · {{ module.settings.dateRange.replace(/_/g, ' ') }}
    </div>
    <p v-if="module.settings.showTotals" class="text-xs leading-relaxed text-surface-600">
      Totals reflect the selected range
      <template v-if="module.settings.comparisonEnabled">with period-over-period comparison enabled.</template>
      <template v-else>without comparison.</template>
    </p>
  </div>
</template>
