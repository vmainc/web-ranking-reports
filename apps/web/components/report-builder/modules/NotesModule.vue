<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'

defineProps<{
  module: Extract<ReportModule, { type: 'notes' }>
}>()
</script>

<template>
  <div class="rounded-lg border border-amber-100 bg-amber-50/40 px-4 py-3">
    <p v-if="module.settings.title" class="text-sm font-semibold text-surface-900">{{ module.settings.title }}</p>
    <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-surface-700">{{ module.settings.body }}</p>
  </div>
</template>
