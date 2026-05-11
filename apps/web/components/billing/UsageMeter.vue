<template>
  <div class="rounded-xl border border-surface-200 bg-white p-4">
    <p class="text-xs font-semibold uppercase tracking-wide text-surface-500">{{ label }}</p>
    <p class="mt-1 text-lg font-semibold text-surface-900">{{ used }} / {{ limitLabel }}</p>
    <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-100">
      <div
        class="h-full rounded-full transition-all"
        :class="barClass"
        :style="{ width: `${Math.min(100, pct)}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ label: string; used: number; limit: number; unlimited?: boolean }>(), {
  unlimited: false,
})

const limitLabel = computed(() => (props.unlimited ? '∞' : String(props.limit)))
const pct = computed(() => {
  if (props.unlimited) return 8
  return props.limit > 0 ? (props.used / props.limit) * 100 : 0
})
const barClass = computed(() => {
  if (props.unlimited) return 'bg-primary-600'
  return pct.value >= 100 ? 'bg-red-500' : pct.value >= 80 ? 'bg-amber-500' : 'bg-primary-600'
})
</script>

