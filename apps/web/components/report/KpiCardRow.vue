<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
    <div
      v-for="(kpi, i) in items"
      :key="i"
      class="rounded-lg border border-surface-200 bg-surface-50/50 p-4 print:break-inside-avoid"
    >
      <p class="text-sm font-medium text-surface-500">{{ kpi.label }}</p>
      <p class="mt-1 text-2xl font-semibold text-surface-900">
        {{ kpi.formatted ?? fmtNum(kpi.value) }}
      </p>
      <p
        v-if="kpi.delta != null && showComparisons"
        class="mt-1 text-xs"
        :class="deltaClass(kpi.delta)"
      >
        {{ kpi.delta > 0 ? '+' : '' }}{{ kpi.delta }}% vs previous
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fmtNum } from '~/utils/format'

withDefaults(
  defineProps<{
    items: Array<{ label: string; value: number; formatted?: string; delta?: number }>
    showComparisons?: boolean
  }>(),
  { showComparisons: true }
)

function deltaClass(delta: number): string {
  if (delta > 0) return 'text-green-600'
  if (delta < 0) return 'text-red-600'
  return 'text-surface-500'
}
</script>
