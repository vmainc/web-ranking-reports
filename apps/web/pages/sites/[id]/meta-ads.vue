<template>
  <SiteIntegrationShell max-width="7xl">
    <div v-if="pending" class="flex justify-center py-12">
      <p class="text-surface-500">Loading…</p>
    </div>

    <template v-else-if="site">
      <div class="mb-8">
        <NuxtLink
          :to="`/sites/${site.id}`"
          class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
        >
          ← {{ site.name }}
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-surface-900">Meta Ads</h1>
        <p class="mt-1 text-sm text-surface-500">
          Campaign spend, clicks, and impressions from the Meta ad account mapped to this site.
        </p>
      </div>

      <div
        v-if="!metaAds"
        class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800"
      >
        <p class="font-medium">No Meta ad account is mapped to this site.</p>
        <p class="mt-1 text-sm">
          Connect Meta from Agency → Integrations, grant
          <code class="font-mono text-xs">ads_read</code>, then use Manage Ad Accounts to map an account here.
        </p>
        <NuxtLink to="/agency?tab=integrations" class="mt-4 inline-block text-sm font-medium underline">
          Open Agency Integrations →
        </NuxtLink>
      </div>

      <template v-else>
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-medium text-surface-900">Campaign performance</h2>
            <p class="mt-0.5 text-sm text-surface-500">
              Account: {{ metaAds.displayName || metaAds.externalAssetId }}
              <span v-if="metaAds.externalAssetId" class="text-surface-400"> (act_{{ metaAds.externalAssetId }})</span>
            </p>
            <p v-if="meta.status === 'reconnect_required'" class="mt-1 text-sm text-amber-700">
              Meta needs to be reconnected before Insights will refresh.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <input
              v-model="startDate"
              type="date"
              class="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <span class="text-surface-400">–</span>
            <input
              v-model="endDate"
              type="date"
              class="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <button
              type="button"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
              :disabled="summaryLoading"
              @click="loadSummary"
            >
              {{ summaryLoading ? 'Loading…' : 'Refresh' }}
            </button>
          </div>
        </div>

        <div v-if="summaryError" class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {{ summaryError }}
        </div>

        <template v-if="summary">
          <div class="mb-8 grid gap-4 sm:grid-cols-3">
            <div class="rounded-xl border-2 border-primary-200 bg-primary-50/50 p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-primary-700">Spend</p>
              <p class="mt-1 text-3xl font-bold text-primary-900">${{ summary.summary.spend.toFixed(2) }}</p>
            </div>
            <div class="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Conversions</p>
              <p class="mt-1 text-3xl font-bold text-emerald-900">
                {{ summary.summary.conversions.toLocaleString(undefined, { maximumFractionDigits: 1 }) }}
              </p>
            </div>
            <div class="rounded-xl border-2 border-sky-200 bg-sky-50/50 p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-sky-700">Clicks</p>
              <p class="mt-1 text-3xl font-bold text-sky-900">{{ summary.summary.clicks.toLocaleString() }}</p>
            </div>
            <div class="rounded-xl border-2 border-violet-200 bg-violet-50/50 p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-violet-700">CPC</p>
              <p class="mt-1 text-3xl font-bold text-violet-900">${{ summary.summary.cpc.toFixed(2) }}</p>
            </div>
            <div class="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-amber-700">Impressions</p>
              <p class="mt-1 text-3xl font-bold text-amber-900">{{ summary.summary.impressions.toLocaleString() }}</p>
            </div>
            <div class="rounded-xl border-2 border-slate-200 bg-slate-50/50 p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-700">CTR</p>
              <p class="mt-1 text-3xl font-bold text-slate-900">{{ summary.summary.ctr.toFixed(2) }}%</p>
            </div>
          </div>

          <div class="mb-8 rounded-xl border border-surface-200 bg-white shadow-sm overflow-hidden">
            <h3 class="border-b border-surface-200 bg-surface-50 px-4 py-3 text-sm font-semibold text-surface-900">
              Trend ({{ summary.startDate }} – {{ summary.endDate }})
            </h3>
            <div v-if="timeseriesLoading" class="flex h-64 items-center justify-center text-sm text-surface-500">
              Loading trend…
            </div>
            <div v-else-if="timeseriesError" class="px-4 py-6 text-sm text-amber-700">{{ timeseriesError }}</div>
            <div v-else-if="!timeseriesRows.length" class="flex h-64 items-center justify-center text-sm text-surface-500">
              No daily data for this period.
            </div>
            <div v-else class="p-4">
              <div ref="trendChartEl" class="h-72 w-full min-h-[18rem]" />
            </div>
          </div>

          <div class="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
            <h3 class="border-b border-surface-200 bg-surface-50 px-4 py-3 text-sm font-semibold text-surface-900">
              By campaign ({{ summary.startDate }} – {{ summary.endDate }})
            </h3>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-surface-200 text-sm">
                <thead class="bg-surface-50">
                  <tr>
                    <th class="px-4 py-2 text-left font-semibold text-surface-600">Campaign</th>
                    <th class="px-4 py-2 text-right font-semibold text-surface-600">Spend</th>
                    <th class="px-4 py-2 text-right font-semibold text-surface-600">Conversions</th>
                    <th class="px-4 py-2 text-right font-semibold text-surface-600">Clicks</th>
                    <th class="px-4 py-2 text-right font-semibold text-surface-600">Impressions</th>
                    <th class="px-4 py-2 text-right font-semibold text-surface-600">CTR</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-100">
                  <tr v-for="row in summary.rows" :key="row.campaignId || row.campaignName">
                    <td class="px-4 py-2.5 font-medium text-surface-900">{{ row.campaignName || '—' }}</td>
                    <td class="px-4 py-2.5 text-right tabular-nums text-surface-700">${{ row.spend.toFixed(2) }}</td>
                    <td class="px-4 py-2.5 text-right tabular-nums text-surface-700">
                      {{ row.conversions.toLocaleString(undefined, { maximumFractionDigits: 1 }) }}
                    </td>
                    <td class="px-4 py-2.5 text-right tabular-nums text-surface-700">{{ row.clicks.toLocaleString() }}</td>
                    <td class="px-4 py-2.5 text-right tabular-nums text-surface-700">{{ row.impressions.toLocaleString() }}</td>
                    <td class="px-4 py-2.5 text-right tabular-nums text-surface-700">{{ row.ctr.toFixed(2) }}%</td>
                  </tr>
                  <tr v-if="!summary.rows.length">
                    <td colspan="6" class="px-4 py-8 text-center text-surface-500">No campaign data for this period.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </template>
    </template>
  </SiteIntegrationShell>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import { getSite } from '~/services/sites'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()

type MetaAdsConn = {
  id: string
  displayName: string
  externalAssetId: string
  status: string
}

type MetaAdsSummary = {
  accountId: string
  accountName: string
  startDate: string
  endDate: string
  summary: {
    spend: number
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cpc: number
  }
  rows: Array<{
    campaignId: string
    campaignName: string
    spend: number
    impressions: number
    clicks: number
    conversions: number
    ctr: number
  }>
}

const site = ref<SiteRecord | null>(null)
const pending = ref(true)
const metaAds = ref<MetaAdsConn | null>(null)
const meta = ref<{ status: string }>({ status: 'disconnected' })
const summary = ref<MetaAdsSummary | null>(null)
const summaryLoading = ref(false)
const summaryError = ref('')
const timeseriesRows = ref<Array<{ date: string; spend: number; clicks: number; conversions: number }>>([])
const timeseriesLoading = ref(false)
const timeseriesError = ref('')
const trendChartEl = ref<HTMLElement | null>(null)
let chart: import('echarts').ECharts | null = null

const endD = new Date()
const startD = new Date()
startD.setDate(startD.getDate() - 30)
const startDate = ref(startD.toISOString().slice(0, 10))
const endDate = ref(endD.toISOString().slice(0, 10))

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadConnection() {
  const res = await $fetch<{
    metaAds?: MetaAdsConn | null
    meta?: { status: string }
  }>(`/api/sites/${siteId.value}/social/connections`, { headers: authHeaders() })
  metaAds.value = res.metaAds || null
  meta.value = res.meta || { status: 'disconnected' }
}

async function loadSummary() {
  if (!metaAds.value) return
  summaryLoading.value = true
  summaryError.value = ''
  try {
    summary.value = await $fetch<MetaAdsSummary>(`/api/sites/${siteId.value}/meta-ads/summary`, {
      headers: authHeaders(),
      query: { startDate: startDate.value, endDate: endDate.value },
    })
    await loadTimeseries()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    summaryError.value = err?.data?.message ?? err?.message ?? 'Failed to load Meta Ads.'
    summary.value = null
  } finally {
    summaryLoading.value = false
  }
}

async function loadTimeseries() {
  timeseriesLoading.value = true
  timeseriesError.value = ''
  try {
    const res = await $fetch<{ rows: Array<{ date: string; spend: number; clicks: number; conversions: number }> }>(
      `/api/sites/${siteId.value}/meta-ads/summary-timeseries`,
      {
        headers: authHeaders(),
        query: { startDate: startDate.value, endDate: endDate.value },
      },
    )
    timeseriesRows.value = res.rows || []
    await nextTick()
    await renderTrend()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    timeseriesError.value = err?.data?.message ?? err?.message ?? 'Failed to load trend.'
    timeseriesRows.value = []
  } finally {
    timeseriesLoading.value = false
  }
}

async function renderTrend() {
  if (chart) {
    chart.dispose()
    chart = null
  }
  const el = trendChartEl.value
  if (!el || !timeseriesRows.value.length) return
  const echarts = await import('echarts')
  chart = echarts.init(el)
  const dates = timeseriesRows.value.map((r) => r.date.slice(5))
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { left: 48, right: 24, top: 24, bottom: 48 },
    xAxis: { type: 'category', data: dates },
    yAxis: [{ type: 'value', name: 'Spend' }, { type: 'value', name: 'Clicks', splitLine: { show: false } }],
    series: [
      {
        name: 'Spend',
        type: 'line',
        smooth: 0.35,
        data: timeseriesRows.value.map((r) => r.spend),
        itemStyle: { color: '#2563eb' },
      },
      {
        name: 'Clicks',
        type: 'line',
        smooth: 0.35,
        yAxisIndex: 1,
        data: timeseriesRows.value.map((r) => r.clicks),
        itemStyle: { color: '#0ea5e9' },
      },
      {
        name: 'Conversions',
        type: 'line',
        smooth: 0.35,
        yAxisIndex: 1,
        data: timeseriesRows.value.map((r) => r.conversions),
        itemStyle: { color: '#10b981' },
      },
    ],
  })
}

async function init() {
  pending.value = true
  try {
    summary.value = null
    summaryError.value = ''
    timeseriesRows.value = []
    site.value = await getSite(pb, siteId.value)
    await loadConnection()
    if (metaAds.value) await loadSummary()
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())

onUnmounted(() => {
  chart?.dispose()
  chart = null
})
</script>
