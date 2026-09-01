<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value: string
    /** Secondary line under the value (e.g. "avg session", "as of …"). */
    hint?: string
    /** Numeric percent delta; shows green/rose arrow treatment when set. */
    delta?: number | null
    /** Override delta text (e.g. "▲ 12" for absolute growth). */
    deltaLabel?: string
    /** Softer accent rail color variant. */
    tone?: 'primary' | 'green' | 'purple' | 'cyan' | 'default'
    compact?: boolean
  }>(),
  { tone: 'primary', compact: false },
)

function deltaTone(delta: number | null | undefined): string {
  if (delta == null) return 'text-surface-500'
  if (delta > 0) return 'text-emerald-600'
  if (delta < 0) return 'text-rose-600'
  return 'text-surface-500'
}

function formatDelta(delta: number): string {
  return `${delta > 0 ? '+' : ''}${delta}% vs prior`
}
</script>

<template>
  <div
    class="report-kpi-tile print:break-inside-avoid"
    :class="[
      `report-kpi-tile--${tone}`,
      compact ? 'report-kpi-tile--compact' : '',
    ]"
  >
    <p class="report-kpi-tile__label">{{ label }}</p>
    <p class="report-kpi-tile__value">{{ value }}</p>
    <p v-if="hint" class="report-kpi-tile__hint">{{ hint }}</p>
    <p
      v-if="deltaLabel || delta != null"
      class="report-kpi-tile__delta"
      :class="deltaTone(delta)"
    >
      <template v-if="deltaLabel">{{ deltaLabel }}</template>
      <template v-else-if="delta != null">
        <span class="inline-flex items-center gap-0.5">
          <svg
            v-if="delta !== 0"
            class="h-3.5 w-3.5"
            :class="delta < 0 ? 'rotate-180' : ''"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
              clip-rule="evenodd"
            />
          </svg>
          {{ formatDelta(delta) }}
        </span>
      </template>
    </p>
  </div>
</template>
