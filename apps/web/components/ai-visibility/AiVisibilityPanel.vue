<script setup lang="ts">
import type { AiVisibilityProfile } from '~/types/aiVisibility'
import ReportKpiTile from '~/components/report-builder/ReportKpiTile.vue'
import {
  aiVisibilityErrorMessage,
  aiVisibilityTotalCost,
  formatAiVisibilityNum,
  formatAiVisibilityWhen,
  platformLabel,
} from '~/utils/aiVisibilityDisplay'

const props = withDefaults(
  defineProps<{
    data: AiVisibilityProfile | null
    loading?: boolean
    error?: string
    compact?: boolean
    showCost?: boolean
    emptyHint?: string
  }>(),
  {
    loading: false,
    error: '',
    compact: false,
    showCost: false,
    emptyHint: 'No AI visibility data yet. Load a snapshot from DataForSEO.',
  },
)

const apiErrors = computed(() => aiVisibilityErrorMessage(props.data?.errors))
const totalCost = computed(() => aiVisibilityTotalCost(props.data?.costs))
const keywordLimit = computed(() => (props.compact ? 5 : 8))
</script>

<template>
  <div class="space-y-4">
    <p v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{{ error }}</p>
    <p v-else-if="loading" class="text-sm text-surface-500">Loading AI visibility…</p>
    <p v-else-if="!data" class="text-sm text-surface-500">{{ emptyHint }}</p>
    <template v-else>
      <p class="text-[11px] text-surface-500">
        Domain <span class="font-mono text-surface-700">{{ data.target }}</span>
        · {{ formatAiVisibilityWhen(data.fetchedAt) }}
        <span v-if="showCost && totalCost > 0" class="ml-1">· Est. API cost ${{ totalCost.toFixed(4) }}</span>
      </p>

      <p
        v-if="apiErrors"
        class="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs leading-relaxed text-amber-900"
      >
        {{ apiErrors }}
      </p>

      <div>
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">Domain visibility</p>
        <div class="grid gap-2.5 sm:grid-cols-3">
          <ReportKpiTile
            label="Total mentions"
            :value="formatAiVisibilityNum(data.domain.total.mentions)"
            hint="Google AI + ChatGPT"
            tone="primary"
            compact
          />
          <ReportKpiTile
            :label="platformLabel('google')"
            :value="formatAiVisibilityNum(data.domain.google?.mentions)"
            :hint="`AI vol ${formatAiVisibilityNum(data.domain.google?.aiSearchVolume)}`"
            tone="cyan"
            compact
          />
          <ReportKpiTile
            :label="platformLabel('chat_gpt')"
            :value="formatAiVisibilityNum(data.domain.chatGpt?.mentions)"
            :hint="`AI vol ${formatAiVisibilityNum(data.domain.chatGpt?.aiSearchVolume)}`"
            tone="purple"
            compact
          />
        </div>
      </div>

      <div v-if="data.domain.topSourceDomains.length && !compact" class="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
        <p class="border-b border-surface-100 bg-surface-50 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-surface-700">
          Top cited source domains
        </p>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-surface-200 text-xs">
            <thead class="bg-surface-50/80">
              <tr>
                <th class="px-3 py-2 text-left font-semibold uppercase tracking-wide text-surface-500">Domain</th>
                <th class="px-3 py-2 text-right font-semibold uppercase tracking-wide text-surface-500">Mentions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-100">
              <tr v-for="row in data.domain.topSourceDomains" :key="row.domain">
                <td class="px-3 py-2 font-medium text-surface-900">{{ row.domain }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-surface-700">{{ formatAiVisibilityNum(row.mentions) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="data.keywords.length">
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">Tracked keywords</p>
        <div class="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-surface-200 text-xs">
              <thead class="bg-surface-50/80">
                <tr>
                  <th class="px-3 py-2 text-left font-semibold uppercase tracking-wide text-surface-500">Keyword</th>
                  <th class="px-3 py-2 text-right font-semibold uppercase tracking-wide text-surface-500">Mentions</th>
                  <th class="px-3 py-2 text-right font-semibold uppercase tracking-wide text-surface-500">AI volume</th>
                  <th v-if="!compact" class="px-3 py-2 text-right font-semibold uppercase tracking-wide text-surface-500">Google</th>
                  <th v-if="!compact" class="px-3 py-2 text-right font-semibold uppercase tracking-wide text-surface-500">ChatGPT</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-100">
                <tr v-for="row in data.keywords.slice(0, keywordLimit)" :key="row.keyword">
                  <td class="max-w-[12rem] truncate px-3 py-2 font-medium text-surface-900">{{ row.keyword }}</td>
                  <td class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-surface-700">
                    {{ formatAiVisibilityNum(row.total.mentions) }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-surface-700">
                    {{ formatAiVisibilityNum(row.total.aiSearchVolume) }}
                  </td>
                  <td v-if="!compact" class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-surface-600">
                    {{ formatAiVisibilityNum(row.google?.mentions) }}
                  </td>
                  <td v-if="!compact" class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-surface-600">
                    {{ formatAiVisibilityNum(row.chatGpt?.mentions) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p class="text-[11px] leading-snug text-surface-500">
        Metrics from DataForSEO LLM Mentions (US / English). AI search volume is an estimate of keyword usage in AI tools, not Google Search volume.
      </p>
    </template>
  </div>
</template>
