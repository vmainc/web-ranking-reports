<template>
  <div class="rounded-xl border border-surface-200 bg-white p-4">
    <p class="text-xs font-semibold uppercase tracking-wide text-surface-500">{{ label }}</p>
    <p class="mt-1 text-lg font-semibold text-surface-900">{{ used }} / {{ limit }}</p>
    <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-100">
      <div
        class="h-full rounded-full transition-all"
        :class="pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-primary-600'"
        :style="{ width: `${Math.min(100, pct)}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ label: string; used: number; limit: number }>()
const pct = computed(() => (props.limit > 0 ? (props.used / props.limit) * 100 : 0))
</script>

