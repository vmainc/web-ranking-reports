<script setup lang="ts">
import type { BacklinksProfile } from '~/types/backlinks'
import {
  backlinksSummaryKpiRows,
  backlinksTotalCost,
  formatBacklinksErrorsForUser,
  formatBacklinksNum,
  formatBacklinksWhen,
  topObjectEntries,
} from '~/utils/backlinksDisplay'

const props = withDefaults(
  defineProps<{
    data: BacklinksProfile | null
    loading?: boolean
    error?: string
    /** Report / classic section — fewer KPIs and table rows. */
    compact?: boolean
    showCost?: boolean
    emptyHint?: string
  }>(),
  {
    loading: false,
    error: '',
    compact: false,
    showCost: false,
    emptyHint: 'No backlink profile yet. Load data to fetch from DataForSEO.',
  },
)

const summaryKpis = computed(() => backlinksSummaryKpiRows(props.data?.summary ?? null, props.compact))

const errorDisplay = computed(() => formatBacklinksErrorsForUser(props.data?.errors))

const totalCost = computed(() => backlinksTotalCost(props.data?.costs))

const hasDistribution = computed(() => {
  const s = props.data?.summary
  if (!s || props.compact) return false
  for (const k of ['referring_links_types', 'referring_links_attributes', 'referring_links_platform_types'] as const) {
    if (topObjectEntries(s[k], 1).length > 0) return true
  }
  return false
})

const domainLimit = computed(() => (props.compact ? 10 : 25))
const anchorLimit = computed(() => (props.compact ? 0 : 20))
const pageLimit = computed(() => (props.compact ? 0 : 15))
const sampleLimit = computed(() => (props.compact ? 0 : 20))
</script>

<template>
  <div class="space-y-3">
    <p v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{{ error }}</p>
    <p v-else-if="loading" class="text-xs text-surface-500">Loading backlink profile…</p>
    <template v-else-if="data">
      <p class="text-[11px] text-surface-500">
        Target <span class="font-mono text-surface-700">{{ data.target }}</span>
        · {{ formatBacklinksWhen(data.fetchedAt) }}
        <span v-if="showCost && totalCost > 0" class="ml-1">· Est. API cost ${{ totalCost.toFixed(4) }}</span>
      </p>
      <div
        v-if="errorDisplay.kind !== 'none'"
        class="rounded-lg border px-3 py-2.5 text-xs leading-relaxed"
        :class="
          errorDisplay.kind === 'subscription'
            ? 'border-amber-300 bg-amber-50 text-amber-950'
            : 'border-amber-200 bg-amber-50/80 text-amber-900'
        "
      >
        <p>{{ errorDisplay.message }}</p>
        <a
          v-if="errorDisplay.subscriptionUrl"
          :href="errorDisplay.subscriptionUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-2 inline-block font-semibold text-primary-700 underline hover:text-primary-600"
        >
          Open DataForSEO Backlinks subscription
        </a>
      </div>
      <div
        v-if="summaryKpis.length"
        class="grid gap-2"
        :class="compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'"
      >
        <div
          v-for="row in summaryKpis"
          :key="row.label"
          class="rounded-lg border border-surface-200 bg-white px-2 py-2 shadow-sm"
          :class="compact ? '' : 'sm:px-3 sm:py-2.5'"
        >
          <p class="text-[10px] font-medium uppercase tracking-wide text-surface-500">{{ row.label }}</p>
          <p class="mt-0.5 text-sm font-semibold text-surface-900">{{ row.value }}</p>
        </div>
      </div>
      <div v-if="hasDistribution" class="grid gap-3 lg:grid-cols-3">
        <div
          v-if="topObjectEntries(data.summary?.referring_links_types, 12).length"
          class="rounded-lg border border-surface-200 bg-surface-50/50 p-3"
        >
          <p class="mb-2 text-[11px] font-semibold text-surface-800">Link types</p>
          <ul class="space-y-1 text-xs text-surface-700">
            <li
              v-for="[k, v] in topObjectEntries(data.summary?.referring_links_types, 12)"
              :key="k"
              class="flex justify-between gap-2"
            >
              <span class="truncate">{{ k }}</span>
              <span class="shrink-0 tabular-nums">{{ v.toLocaleString() }}</span>
            </li>
          </ul>
        </div>
        <div
          v-if="topObjectEntries(data.summary?.referring_links_attributes, 12).length"
          class="rounded-lg border border-surface-200 bg-surface-50/50 p-3"
        >
          <p class="mb-2 text-[11px] font-semibold text-surface-800">Link attributes</p>
          <ul class="space-y-1 text-xs text-surface-700">
            <li
              v-for="[k, v] in topObjectEntries(data.summary?.referring_links_attributes, 12)"
              :key="k"
              class="flex justify-between gap-2"
            >
              <span class="truncate">{{ k }}</span>
              <span class="shrink-0 tabular-nums">{{ v.toLocaleString() }}</span>
            </li>
          </ul>
        </div>
        <div
          v-if="topObjectEntries(data.summary?.referring_links_platform_types, 12).length"
          class="rounded-lg border border-surface-200 bg-surface-50/50 p-3"
        >
          <p class="mb-2 text-[11px] font-semibold text-surface-800">Platform types</p>
          <ul class="space-y-1 text-xs text-surface-700">
            <li
              v-for="[k, v] in topObjectEntries(data.summary?.referring_links_platform_types, 12)"
              :key="k"
              class="flex justify-between gap-2"
            >
              <span class="truncate">{{ k }}</span>
              <span class="shrink-0 tabular-nums">{{ v.toLocaleString() }}</span>
            </li>
          </ul>
        </div>
      </div>
      <div v-if="data.referringDomains.length" class="overflow-hidden rounded-lg border border-surface-200 bg-white">
        <p class="border-b border-surface-100 bg-surface-50 px-3 py-2 text-[11px] font-semibold text-surface-800">
          Top referring domains
        </p>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-surface-200 text-xs">
            <thead class="bg-surface-50">
              <tr>
                <th class="px-3 py-2 text-left font-medium text-surface-600">Domain</th>
                <th class="px-3 py-2 text-left font-medium text-surface-600">Rank</th>
                <th class="px-3 py-2 text-left font-medium text-surface-600">Backlinks</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-200">
              <tr v-for="(r, i) in data.referringDomains.slice(0, domainLimit)" :key="i">
                <td class="px-3 py-2 font-mono text-surface-800">{{ r.domain ?? '—' }}</td>
                <td class="px-3 py-2">{{ formatBacklinksNum(r.rank) }}</td>
                <td class="px-3 py-2">{{ formatBacklinksNum(r.backlinks) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-if="anchorLimit && data.anchors.length" class="overflow-hidden rounded-lg border border-surface-200 bg-white">
        <p class="border-b border-surface-100 bg-surface-50 px-3 py-2 text-[11px] font-semibold text-surface-800">
          Top anchor text
        </p>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-surface-200 text-xs">
            <thead class="bg-surface-50">
              <tr>
                <th class="px-3 py-2 text-left font-medium text-surface-600">Anchor</th>
                <th class="px-3 py-2 text-left font-medium text-surface-600">Backlinks</th>
                <th class="px-3 py-2 text-left font-medium text-surface-600">Domains</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-200">
              <tr v-for="(r, i) in data.anchors.slice(0, anchorLimit)" :key="i">
                <td class="max-w-xs truncate px-3 py-2 text-surface-800">{{ r.anchor || '—' }}</td>
                <td class="px-3 py-2">{{ formatBacklinksNum(r.backlinks) }}</td>
                <td class="px-3 py-2">{{ formatBacklinksNum(r.referring_domains) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-if="pageLimit && data.domainPages.length" class="overflow-hidden rounded-lg border border-surface-200 bg-white">
        <p class="border-b border-surface-100 bg-surface-50 px-3 py-2 text-[11px] font-semibold text-surface-800">
          Your pages with the most backlinks
        </p>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-surface-200 text-xs">
            <thead class="bg-surface-50">
              <tr>
                <th class="px-3 py-2 text-left font-medium text-surface-600">Page</th>
                <th class="px-3 py-2 text-left font-medium text-surface-600">Backlinks</th>
                <th class="px-3 py-2 text-left font-medium text-surface-600">Domains</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-200">
              <tr v-for="(r, i) in data.domainPages.slice(0, pageLimit)" :key="i">
                <td class="max-w-md truncate px-3 py-2 text-surface-800">{{ r.page || r.title || '—' }}</td>
                <td class="px-3 py-2">{{ formatBacklinksNum(r.backlinks) }}</td>
                <td class="px-3 py-2">{{ formatBacklinksNum(r.referring_domains) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-if="sampleLimit && data.sampleBacklinks.length" class="overflow-hidden rounded-lg border border-surface-200 bg-white">
        <p class="border-b border-surface-100 bg-surface-50 px-3 py-2 text-[11px] font-semibold text-surface-800">
          Sample backlinks (highest rank)
        </p>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-surface-200 text-xs">
            <thead class="bg-surface-50">
              <tr>
                <th class="px-3 py-2 text-left font-medium text-surface-600">From</th>
                <th class="px-3 py-2 text-left font-medium text-surface-600">Anchor</th>
                <th class="px-3 py-2 text-left font-medium text-surface-600">Rank</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-200">
              <tr v-for="(r, i) in data.sampleBacklinks.slice(0, sampleLimit)" :key="i">
                <td class="max-w-xs truncate px-3 py-2 font-mono text-surface-800">{{ r.domain_from ?? '—' }}</td>
                <td class="max-w-xs truncate px-3 py-2 text-surface-700">{{ r.anchor || '—' }}</td>
                <td class="px-3 py-2">{{ formatBacklinksNum(r.rank) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
    <p v-else class="text-xs text-surface-500">{{ emptyHint }}</p>
  </div>
</template>
