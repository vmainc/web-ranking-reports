<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'

const props = defineProps<{
  module: Extract<ReportModule, { type: 'keyword_rankings' }>
}>()

const demoKeywords = ['seo agency pricing', 'local seo services', 'technical seo audit', 'content strategy', 'link building']

const rows = computed(() => demoKeywords.slice(0, Math.max(1, Math.min(props.module.settings.maxKeywords, demoKeywords.length))))
</script>

<template>
  <div class="space-y-3">
    <p class="text-xs font-medium text-surface-600">{{ module.settings.keywordGroupName }}</p>
    <div class="overflow-hidden rounded-lg border border-surface-200">
      <table class="min-w-full divide-y divide-surface-200 text-sm">
        <thead class="bg-surface-50 text-left text-[11px] font-semibold uppercase tracking-wide text-surface-500">
          <tr>
            <th class="px-3 py-2">Keyword</th>
            <th v-if="module.settings.showCurrentRank" class="px-3 py-2 text-right">Rank</th>
            <th v-if="module.settings.showChangeColumn" class="px-3 py-2 text-right">Δ</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-100 bg-white">
          <tr v-for="row in rows" :key="row">
            <td class="px-3 py-2 font-medium text-surface-800">{{ row }}</td>
            <td v-if="module.settings.showCurrentRank" class="px-3 py-2 text-right tabular-nums text-surface-900">4</td>
            <td v-if="module.settings.showChangeColumn" class="px-3 py-2 text-right text-emerald-600">+3</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-[11px] text-surface-500">Showing up to {{ module.settings.maxKeywords }} keywords (preview).</p>
  </div>
</template>
