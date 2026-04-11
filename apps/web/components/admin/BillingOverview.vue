<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
    <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
      <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Trial sites</p>
      <p class="mt-1 text-2xl font-semibold text-surface-900">{{ overview.trialSites }}</p>
    </div>
    <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
      <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Active subs</p>
      <p class="mt-1 text-2xl font-semibold text-surface-900">{{ overview.activeSubscriptions }}</p>
    </div>
    <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
      <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Past due</p>
      <p class="mt-1 text-2xl font-semibold text-amber-800">{{ overview.pastDue }}</p>
    </div>
    <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
      <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Canceled</p>
      <p class="mt-1 text-2xl font-semibold text-surface-700">{{ overview.canceled }}</p>
    </div>
    <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-1">
      <p class="text-xs font-medium uppercase tracking-wide text-surface-500">MRR (est.)</p>
      <p class="mt-1 text-2xl font-semibold text-primary-700">${{ overview.mrrEstimateUsd.toFixed(2) }}</p>
      <p class="mt-0.5 text-xs text-surface-500">$19.99 × active subs</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  overview: {
    trialSites: number
    activeSubscriptions: number
    pastDue: number
    canceled: number
    mrrEstimateUsd: number
  }
}>()
</script>
