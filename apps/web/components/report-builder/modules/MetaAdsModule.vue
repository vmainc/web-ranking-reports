<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'
import ReportKpiTile from '~/components/report-builder/ReportKpiTile.vue'
import { getCompareDateRange, getDateRangeForPreset } from '~/utils/dateRange'

defineProps<{
  module: Extract<ReportModule, { type: 'meta_ads' }>
}>()

const { rangePreset, compareToPrevious } = useReportDateRange()
const pb = usePocketbase()

const siteIdRef = inject<Ref<string | null>>('reportBuilderSiteId', ref(null))
const siteId = computed(() => siteIdRef.value)

type MetaAdsSummary = {
  accountName: string
  summary: {
    spend: number
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cpc: number
  }
  rows: Array<{
    campaignName: string
    spend: number
    conversions: number
    clicks: number
    impressions: number
  }>
}

const loading = ref(false)
const error = ref('')
const summary = ref<MetaAdsSummary | null>(null)
const compareSummary = ref<MetaAdsSummary['summary'] | null>(null)
const rangeLabel = ref('')
const accountName = ref('')

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatRangeTitle(start: string, end: string) {
  try {
    const a = new Date(start + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const b = new Date(end + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    return `${a} – ${b}`
  } catch {
    return `${start} – ${end}`
  }
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n)
}

function pctDelta(current: number, prior: number): number | null {
  if (!compareToPrevious.value || compareSummary.value == null) return null
  if (prior === 0) return current === 0 ? 0 : 100
  return Math.round(((current - prior) / prior) * 1000) / 10
}

const kpis = computed(() => {
  const s = summary.value?.summary
  if (!s) return []
  const prev = compareSummary.value
  const tones = ['primary', 'green', 'cyan', 'purple', 'default', 'cyan'] as const
  return [
    { key: 'spend', label: 'Spend', value: formatCurrency(s.spend), delta: prev ? pctDelta(s.spend, prev.spend) : null, tone: tones[0] },
    { key: 'conversions', label: 'Conversions', value: s.conversions.toLocaleString(undefined, { maximumFractionDigits: 1 }), delta: prev ? pctDelta(s.conversions, prev.conversions) : null, tone: tones[1] },
    { key: 'clicks', label: 'Clicks', value: s.clicks.toLocaleString(), delta: prev ? pctDelta(s.clicks, prev.clicks) : null, tone: tones[2] },
    { key: 'cpc', label: 'CPC', value: formatCurrency(s.cpc), delta: null, tone: tones[3] },
    { key: 'impressions', label: 'Impressions', value: s.impressions.toLocaleString(), delta: prev ? pctDelta(s.impressions, prev.impressions) : null, tone: tones[4] },
    { key: 'ctr', label: 'CTR', value: `${s.ctr.toFixed(2)}%`, delta: null, tone: tones[5] },
  ] satisfies Array<{
    key: string
    label: string
    value: string
    delta: number | null
    tone: 'primary' | 'green' | 'purple' | 'cyan' | 'default'
  }>
})

async function fetchSummary(startDate: string, endDate: string) {
  return $fetch<MetaAdsSummary>(`/api/sites/${siteId.value}/meta-ads/summary`, {
    headers: authHeaders(),
    query: { startDate, endDate },
  })
}

async function load() {
  error.value = ''
  summary.value = null
  compareSummary.value = null
  rangeLabel.value = ''
  accountName.value = ''
  if (!siteId.value) {
    error.value = 'Select a site to load Meta Ads data.'
    return
  }
  loading.value = true
  try {
    const preset = rangePreset.value
    const { startDate, endDate } = getDateRangeForPreset(preset)
    rangeLabel.value = formatRangeTitle(startDate, endDate)
    summary.value = await fetchSummary(startDate, endDate)
    accountName.value = summary.value.accountName || ''

    if (compareToPrevious.value) {
      const cmp = getCompareDateRange(startDate, endDate)
      const prev = await fetchSummary(cmp.startDate, cmp.endDate)
      compareSummary.value = prev.summary
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? (e instanceof Error ? e.message : String(e)) ?? 'Failed to load Meta Ads.'
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())

watch(
  () => [siteId.value, rangePreset.value, compareToPrevious.value] as const,
  () => void load(),
)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3 text-sm">
    <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{{ error }}</div>
    <div v-else-if="loading" class="flex flex-1 items-center justify-center rounded-lg border border-dashed border-surface-200 bg-surface-50/50 py-12 text-sm text-surface-500">
      Loading Meta Ads…
    </div>
    <template v-else-if="summary">
      <div class="flex flex-wrap items-baseline justify-between gap-2 text-xs text-surface-500">
        <div>
          <span v-if="rangeLabel" class="font-medium">{{ rangeLabel }}</span>
          <span v-if="accountName" class="mt-0.5 block text-[11px] text-surface-400">{{ accountName }}</span>
        </div>
      </div>
      <div class="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <ReportKpiTile
          v-for="kpi in kpis"
          :key="kpi.key"
          :label="kpi.label"
          :value="kpi.value"
          :delta="kpi.delta"
          :tone="kpi.tone"
          compact
        />
      </div>
      <div class="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
        <p class="border-b border-surface-100 bg-surface-50 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-surface-700">
          By campaign
        </p>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-surface-200 text-xs">
            <thead class="bg-surface-50/80">
              <tr>
                <th class="px-3 py-2 text-left font-semibold uppercase tracking-wide text-surface-500">Campaign</th>
                <th class="px-3 py-2 text-right font-semibold uppercase tracking-wide text-surface-500">Spend</th>
                <th class="px-3 py-2 text-right font-semibold uppercase tracking-wide text-surface-500">Conversions</th>
                <th class="px-3 py-2 text-right font-semibold uppercase tracking-wide text-surface-500">Clicks</th>
                <th class="px-3 py-2 text-right font-semibold uppercase tracking-wide text-surface-500">Impressions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-100">
              <tr v-for="row in summary.rows" :key="row.campaignName" class="hover:bg-surface-50/60">
                <td class="px-3 py-2.5 font-medium text-surface-900">{{ row.campaignName || '—' }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums text-surface-700">{{ formatCurrency(row.spend) }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums text-surface-700">
                  {{ row.conversions.toLocaleString(undefined, { maximumFractionDigits: 1 }) }}
                </td>
                <td class="px-3 py-2.5 text-right tabular-nums text-surface-700">{{ row.clicks.toLocaleString() }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums text-surface-700">{{ row.impressions.toLocaleString() }}</td>
              </tr>
              <tr v-if="summary.rows.length === 0">
                <td colspan="5" class="px-3 py-6 text-center text-surface-500">No campaign data for this period.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
