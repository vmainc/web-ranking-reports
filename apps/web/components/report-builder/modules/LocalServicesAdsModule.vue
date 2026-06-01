<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'
import { getCompareDateRange, getDateRangeForPreset } from '~/utils/dateRange'

const props = defineProps<{
  module: Extract<ReportModule, { type: 'local_services_ads' }>
}>()

const siteIdRef = inject<Ref<string | null>>('reportBuilderSiteId', ref(null))
const siteId = computed(() => siteIdRef.value)

const { getStatus, getLocalServicesSummary } = useGoogleIntegration()

type LsaSummary = Awaited<ReturnType<typeof getLocalServicesSummary>>

const loading = ref(false)
const error = ref('')
const summary = ref<LsaSummary | null>(null)
const compareSummary = ref<LsaSummary['summary'] | null>(null)
const rangeLabel = ref('')
const accountName = ref('')

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

function pctChange(current: number, prior: number): string | null {
  if (!props.module.settings.compareToPrevious || compareSummary.value == null) return null
  if (prior === 0) return current === 0 ? '0%' : '—'
  const pct = ((current - prior) / prior) * 100
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

const kpis = computed(() => {
  const s = summary.value?.summary
  if (!s) return []
  const prev = compareSummary.value
  const costPerLead = s.leads > 0 ? s.cost / s.leads : 0
  const ctr = s.impressions ? (s.clicks / s.impressions) * 100 : 0
  const leadRate = s.clicks ? (s.leads / s.clicks) * 100 : 0
  return [
    { key: 'cost', label: 'Cost', value: formatCurrency(s.cost), change: prev ? pctChange(s.cost, prev.cost) : null },
    { key: 'leads', label: 'Leads', value: s.leads.toLocaleString(undefined, { maximumFractionDigits: 1 }), change: prev ? pctChange(s.leads, prev.leads) : null },
    { key: 'clicks', label: 'Clicks', value: s.clicks.toLocaleString(), change: prev ? pctChange(s.clicks, prev.clicks) : null },
    { key: 'cpl', label: 'Cost / lead', value: formatCurrency(costPerLead), change: null },
    { key: 'impressions', label: 'Impressions', value: s.impressions.toLocaleString(), change: prev ? pctChange(s.impressions, prev.impressions) : null },
    { key: 'ctr', label: 'CTR', value: `${ctr.toFixed(2)}%`, change: null },
    { key: 'leadRate', label: 'Lead rate', value: `${leadRate.toFixed(2)}%`, change: null },
  ]
})

async function load() {
  error.value = ''
  summary.value = null
  compareSummary.value = null
  rangeLabel.value = ''
  accountName.value = ''
  if (!siteId.value) {
    error.value = 'Select a site to load Local Service Ads data.'
    return
  }
  loading.value = true
  try {
    const status = await getStatus(siteId.value).catch(() => null)
    if (!status?.selectedLocalServicesCustomer) {
      error.value = 'Connect Google Local Service Ads and choose an account for this site.'
      return
    }
    accountName.value = status.selectedLocalServicesCustomer.name ?? ''

    const preset = props.module.settings.rangePreset
    const { startDate, endDate } = getDateRangeForPreset(preset)
    rangeLabel.value = formatRangeTitle(startDate, endDate)

    summary.value = await getLocalServicesSummary(siteId.value, startDate, endDate)

    if (props.module.settings.compareToPrevious) {
      const cmp = getCompareDateRange(startDate, endDate)
      const prev = await getLocalServicesSummary(siteId.value, cmp.startDate, cmp.endDate)
      compareSummary.value = prev.summary
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? (e instanceof Error ? e.message : String(e)) ?? 'Failed to load Local Service Ads.'
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())

watch(
  () => [siteId.value, props.module.settings.rangePreset, props.module.settings.compareToPrevious] as const,
  () => void load(),
)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3 text-sm">
    <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{{ error }}</div>
    <div v-else-if="loading" class="flex flex-1 items-center justify-center rounded-lg border border-dashed border-surface-200 bg-surface-50/50 py-12 text-sm text-surface-500">
      Loading Local Service Ads…
    </div>
    <template v-else-if="summary">
      <div class="flex flex-wrap items-baseline justify-between gap-2 text-xs text-surface-500">
        <div>
          <span v-if="rangeLabel">{{ rangeLabel }}</span>
          <span v-if="accountName" class="mt-0.5 block text-[11px] text-surface-400">{{ accountName }}</span>
        </div>
      </div>
      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="kpi in kpis"
          :key="kpi.key"
          class="rounded-lg border border-surface-200 bg-white px-3 py-2.5 shadow-sm"
        >
          <p class="text-[10px] font-semibold uppercase tracking-wide text-surface-500">{{ kpi.label }}</p>
          <p class="mt-0.5 text-base font-semibold tabular-nums text-surface-900">{{ kpi.value }}</p>
          <p v-if="kpi.change" class="mt-0.5 text-[10px] text-surface-500">vs prior: {{ kpi.change }}</p>
        </div>
      </div>
      <div class="overflow-hidden rounded-lg border border-surface-200 bg-white">
        <p class="border-b border-surface-100 bg-surface-50 px-3 py-2 text-xs font-semibold text-surface-900">
          By campaign
        </p>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-surface-200 text-xs">
            <thead class="bg-surface-50">
              <tr>
                <th class="px-3 py-2 text-left font-medium text-surface-600">Campaign</th>
                <th class="px-3 py-2 text-right font-medium text-surface-600">Cost</th>
                <th class="px-3 py-2 text-right font-medium text-surface-600">Leads</th>
                <th class="px-3 py-2 text-right font-medium text-surface-600">Clicks</th>
                <th class="px-3 py-2 text-right font-medium text-surface-600">Impressions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-200">
              <tr v-for="row in summary.rows" :key="row.campaignName">
                <td class="px-3 py-2 font-medium text-surface-900">{{ row.campaignName || '—' }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-surface-700">{{ formatCurrency(row.cost) }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-surface-700">
                  {{ row.leads.toLocaleString(undefined, { maximumFractionDigits: 1 }) }}
                </td>
                <td class="px-3 py-2 text-right tabular-nums text-surface-700">{{ row.clicks.toLocaleString() }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-surface-700">{{ row.impressions.toLocaleString() }}</td>
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
