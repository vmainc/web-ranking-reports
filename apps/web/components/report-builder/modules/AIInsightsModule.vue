<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'

defineProps<{
  module: Extract<ReportModule, { type: 'ai_insights' }>
}>()

const toneClass: Record<string, string> = {
  professional: 'border-l-primary-600',
  friendly: 'border-l-emerald-500',
  concise: 'border-l-amber-500',
}
</script>

<template>
  <div
    class="rounded-xl border border-surface-100 bg-gradient-to-br from-surface-50 to-white px-4 py-4 shadow-sm"
    :class="['border-l-4', toneClass[module.settings.tone] || toneClass.professional]"
  >
    <div class="mb-2 flex items-center justify-between gap-2">
      <span class="text-[10px] font-semibold uppercase tracking-wide text-surface-500">AI summary · {{ module.settings.tone }}</span>
      <span class="rounded-full bg-surface-200/80 px-2 py-0.5 text-[10px] font-medium text-surface-600">Preview</span>
    </div>
    <p class="text-sm leading-relaxed text-surface-800">{{ module.settings.body }}</p>
  </div>
</template>
