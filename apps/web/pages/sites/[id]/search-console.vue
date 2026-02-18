<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
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
        <h1 class="text-2xl font-semibold text-surface-900">Google Search Console</h1>
        <p class="mt-1 text-sm text-surface-500">Choose a property and view search performance for this site.</p>
      </div>

      <div
        v-if="googleConnectedToast"
        class="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
      >
        Google connected successfully. Select a Search Console property below to view reports.
      </div>

      <!-- Not connected -->
      <div
        v-if="!showSiteSelection && !showReports && googleStatus && !googleStatus.connected"
        class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800"
      >
        <p class="font-medium">Google Search Console is not connected for this site.</p>
        <p class="mt-1 text-sm">Connect Google from the Integrations section on the site page to enable reports.</p>
        <NuxtLink :to="`/sites/${site.id}`" class="mt-4 inline-block text-sm font-medium underline">
          Go to {{ site.name }} →
        </NuxtLink>
      </div>

      <!-- Property selection (connected but no GSC site selected) -->
      <section v-else-if="showSiteSelection" class="mb-10">
        <h2 class="mb-2 text-lg font-medium text-surface-900">Choose your Search Console property</h2>
        <p class="mb-4 text-sm text-surface-500">
          Select which Search Console site (property) to use for reports. We'll load your properties from Google.
        </p>
        <p class="mb-4 text-sm text-surface-500">
          <button
            type="button"
            class="text-primary-600 hover:underline"
            :disabled="disconnecting"
            @click="handleDisconnect"
          >
            Use a different Google account
          </button>
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <select
            v-model="siteSelectUrl"
            class="min-w-[200px] rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            :disabled="sitesLoading"
          >
            <option value="">
              {{ sitesLoading ? 'Loading properties…' : sites.length ? '— Select property —' : 'Click Load properties' }}
            </option>
            <option v-for="s in sites" :key="s.siteUrl" :value="s.siteUrl">
              {{ s.siteUrl }}
            </option>
          </select>
          <button
            v-if="!sites.length && !sitesLoading"
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
            @click="loadSites"
          >
            Load properties
          </button>
          <button
            v-else-if="siteSelectUrl"
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="siteSaving"
            @click="saveSite"
          >
            {{ siteSaving ? 'Saving…' : 'Use this property' }}
          </button>
        </div>
        <p v-if="sitesHint" class="mt-2 text-sm text-surface-600">{{ sitesHint }}</p>
        <div v-if="siteError" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p class="font-medium">Could not load properties</p>
          <p class="mt-1">{{ siteError }}</p>
          <p class="mt-2 text-xs">Make sure you have access in Search Console. If you just connected, try disconnecting and reconnecting Google to get the right scope.</p>
          <button
            type="button"
            class="mt-3 rounded bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-200"
            @click="loadSites"
          >
            Retry
          </button>
        </div>
      </section>

      <!-- Reports (GSC site selected) – dashboard style: preset range, auto-load -->
      <template v-else-if="showReports">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-medium text-surface-900">Search performance</h2>
            <p class="mt-0.5 text-sm text-surface-500">
              Property: {{ googleStatus.selectedSearchConsoleSite?.name }}
            </p>
            <p class="mt-1 text-sm text-surface-500">
              <button
                type="button"
                class="text-primary-600 hover:underline"
                :disabled="changingSite || disconnecting"
                @click="handleChangeSite"
              >
                Change property
              </button>
              <span class="text-surface-400"> · </span>
              <button
                type="button"
                class="text-primary-600 hover:underline"
                :disabled="changingSite || disconnecting"
                @click="handleDisconnect"
              >
                Use a different Google account
              </button>
              <span class="text-surface-400"> · </span>
              <button
                type="button"
                class="text-primary-600 hover:underline"
                :disabled="reconnecting"
                @click="handleReconnectGoogle"
              >
                {{ reconnecting ? 'Opening…' : 'Reconnect Google (fix 403)' }}
              </button>
            </p>
          </div>
          <div
            v-if="showReconnectBanner"
            class="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
          >
            <p class="text-sm font-medium">
              Search Console returned 403 — your Google connection may be missing Search Console permission. Reconnect to grant access.
            </p>
            <button
              type="button"
              class="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
              :disabled="reconnecting"
              @click="handleReconnectGoogle"
            >
              {{ reconnecting ? 'Opening…' : 'Reconnect Google' }}
            </button>
          </div>
          <select
            v-model="rangePreset"
            class="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900"
          >
            <option value="last_7_days">Last 7 days</option>
            <option value="last_28_days">Last 28 days</option>
            <option value="last_90_days">Last 90 days</option>
          </select>
        </div>
        <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6">
          <p class="mb-4 text-sm text-surface-500">{{ rangeSubtitle }}</p>
          <p v-if="reportError" class="mb-4 text-sm text-red-600">{{ reportError }}</p>
          <div v-if="reportLoading" class="py-12 text-center text-sm text-surface-500">Loading…</div>

          <template v-else>
          <div v-if="reportSummary" class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div class="rounded-xl border border-surface-200 bg-surface-50 p-5">
              <p class="text-sm font-medium text-surface-500">Clicks</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">{{ reportSummary.clicks.toLocaleString() }}</p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-surface-50 p-5">
              <p class="text-sm font-medium text-surface-500">Impressions</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">{{ reportSummary.impressions.toLocaleString() }}</p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-surface-50 p-5">
              <p class="text-sm font-medium text-surface-500">CTR</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">
                {{ (reportSummary.ctr * 100).toFixed(2) }}%
              </p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-surface-50 p-5">
              <p class="text-sm font-medium text-surface-500">Avg position</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">
                {{ reportSummary.position.toFixed(1) }}
              </p>
            </div>
          </div>

          <div v-if="reportRows.length" class="rounded-xl border border-surface-200 bg-white p-4">
            <h3 class="mb-3 text-sm font-medium text-surface-700">Clicks over time</h3>
            <div ref="clicksChartEl" class="h-[280px] w-full" />
          </div>
          <p v-else-if="!reportError" class="py-6 text-center text-sm text-surface-500">
            No data for this period.
          </p>
          </template>
        </section>

        <!-- Top queries (keywords) -->
        <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6">
          <h3 class="mb-2 text-lg font-medium text-surface-900">Top queries (keywords)</h3>
          <p class="mb-4 text-sm text-surface-500">Search terms that drove clicks and impressions for this property in the selected period.</p>
          <p v-if="queriesError" class="mb-4 text-sm text-red-600">{{ queriesError }}</p>
          <div v-if="queriesLoading" class="py-8 text-center text-sm text-surface-500">Loading…</div>
          <div v-else-if="queriesRows.length" class="overflow-x-auto rounded-lg border border-surface-200">
            <table class="min-w-full divide-y divide-surface-200 text-left text-sm">
              <thead class="bg-surface-50">
                <tr>
                  <th class="px-4 py-3 font-medium text-surface-700">Query</th>
                  <th class="px-4 py-3 font-medium text-surface-700">Clicks</th>
                  <th class="px-4 py-3 font-medium text-surface-700">Impressions</th>
                  <th class="px-4 py-3 font-medium text-surface-700">CTR</th>
                  <th class="px-4 py-3 font-medium text-surface-700">Position</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-200">
                <tr v-for="(row, i) in queriesRows" :key="i" class="hover:bg-surface-50">
                  <td class="max-w-[280px] truncate px-4 py-2 font-medium text-surface-900" :title="row.query">{{ row.query }}</td>
                  <td class="px-4 py-2 text-surface-600">{{ row.clicks.toLocaleString() }}</td>
                  <td class="px-4 py-2 text-surface-600">{{ row.impressions.toLocaleString() }}</td>
                  <td class="px-4 py-2 text-surface-600">{{ (row.ctr * 100).toFixed(2) }}%</td>
                  <td class="px-4 py-2 text-surface-600">{{ row.position.toFixed(1) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else-if="!queriesError" class="py-6 text-center text-sm text-surface-500">No query data for this period.</p>
        </section>

        <!-- Top pages -->
        <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6">
          <h3 class="mb-2 text-lg font-medium text-surface-900">Top pages</h3>
          <p class="mb-4 text-sm text-surface-500">URLs that appeared most in search results for the selected period.</p>
          <p v-if="pagesError" class="mb-4 text-sm text-red-600">{{ pagesError }}</p>
          <div v-if="pagesLoading" class="py-8 text-center text-sm text-surface-500">Loading…</div>
          <div v-else-if="pagesRows.length" class="overflow-x-auto rounded-lg border border-surface-200">
            <table class="min-w-full divide-y divide-surface-200 text-left text-sm">
              <thead class="bg-surface-50">
                <tr>
                  <th class="px-4 py-3 font-medium text-surface-700">Page</th>
                  <th class="px-4 py-3 font-medium text-surface-700">Clicks</th>
                  <th class="px-4 py-3 font-medium text-surface-700">Impressions</th>
                  <th class="px-4 py-3 font-medium text-surface-700">CTR</th>
                  <th class="px-4 py-3 font-medium text-surface-700">Position</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-200">
                <tr v-for="(row, i) in pagesRows" :key="i" class="hover:bg-surface-50">
                  <td class="max-w-[320px] truncate px-4 py-2 font-medium text-surface-900" :title="row.page">{{ row.page }}</td>
                  <td class="px-4 py-2 text-surface-600">{{ row.clicks.toLocaleString() }}</td>
                  <td class="px-4 py-2 text-surface-600">{{ row.impressions.toLocaleString() }}</td>
                  <td class="px-4 py-2 text-surface-600">{{ (row.ctr * 100).toFixed(2) }}%</td>
                  <td class="px-4 py-2 text-surface-600">{{ row.position.toFixed(1) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else-if="!pagesError" class="py-6 text-center text-sm text-surface-500">No page data for this period.</p>
        </section>

      </template>
    </template>

    <div v-else class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-500">Site not found.</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-primary-600 hover:underline">Back to Dashboard</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import type { GoogleStatusResponse } from '~/composables/useGoogleIntegration'
import { getSite } from '~/services/sites'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'
import { getApiErrorMessage } from '~/utils/apiError'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)

const pb = usePocketbase()
const { getStatus, getGscSites, selectGscSite, clearGscSite, getGscReport, getGscReportQueries, getGscReportPages, disconnect, getAuthUrl } = useGoogleIntegration()
const site = ref<SiteRecord | null>(null)
const googleStatus = ref<GoogleStatusResponse | null>(null)
const googleConnectedToast = ref(false)
const pending = ref(true)

const showSiteSelection = computed(() => {
  if (googleStatus.value?.selectedSearchConsoleSite) return false
  if (googleStatus.value?.connected) return true
  return false
})

const showReports = computed(
  () => !!(googleStatus.value?.connected && googleStatus.value?.selectedSearchConsoleSite)
)

const sites = ref<Array<{ siteUrl: string; permissionLevel?: string }>>([])
const sitesLoading = ref(false)
const sitesHint = ref('')
const siteSelectUrl = ref('')
const siteSaving = ref(false)
const siteError = ref('')

const rangePreset = ref<'last_7_days' | 'last_28_days' | 'last_90_days'>('last_28_days')
function dateRangeFromPreset(preset: string): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  if (preset === 'last_7_days') start.setDate(end.getDate() - 6)
  else if (preset === 'last_90_days') start.setDate(end.getDate() - 89)
  else start.setDate(end.getDate() - 27)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}
const rangeSubtitle = computed(() => {
  const p = rangePreset.value
  if (p === 'last_7_days') return 'Last 7 days'
  if (p === 'last_28_days') return 'Last 28 days'
  if (p === 'last_90_days') return 'Last 90 days'
  return p
})

const reportLoading = ref(false)
const reportError = ref('')
const reportSummary = ref<{ clicks: number; impressions: number; ctr: number; position: number } | null>(null)
const reportRows = ref<Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>>([])

const queriesLoading = ref(false)
const queriesError = ref('')
const queriesRows = ref<Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>>([])

const pagesLoading = ref(false)
const pagesError = ref('')
const pagesRows = ref<Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>>([])

const changingSite = ref(false)
const disconnecting = ref(false)
const reconnecting = ref(false)

const showReconnectBanner = computed(
  () =>
    !!(
      (reportError.value && reportError.value.includes('403')) ||
      (queriesError.value && queriesError.value.includes('403')) ||
      (pagesError.value && pagesError.value.includes('403'))
    )
)

const clicksChartEl = ref<HTMLElement | null>(null)
let clicksChart: import('echarts').ECharts | null = null

function renderClicksChart() {
  if (!reportRows.value.length || !clicksChartEl.value) return
  const dates = reportRows.value.map((r) => r.date)
  const clicks = reportRows.value.map((r) => r.clicks)
  import('echarts').then((echarts) => {
    if (clicksChart) clicksChart.dispose()
    clicksChart = echarts.init(clicksChartEl.value!)
    clicksChart.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const p = Array.isArray(params) ? params[0] : params
          const idx = (p as { dataIndex?: number }).dataIndex
          if (idx == null || !reportRows.value[idx]) return ''
          const row = reportRows.value[idx]
          return `${row.date}<br/>Clicks: ${row.clicks}<br/>Impressions: ${row.impressions}<br/>CTR: ${(row.ctr * 100).toFixed(2)}% · Pos: ${row.position.toFixed(1)}`
        },
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: 'Clicks',
        minInterval: 1,
        axisLabel: { fontSize: 11 },
      },
      series: [
        {
          name: 'Clicks',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2 },
          areaStyle: { opacity: 0.25 },
          itemStyle: { color: '#2563eb' },
          data: clicks,
        },
      ],
    })
  })
}

async function loadSite() {
  const s = await getSite(pb, siteId.value)
  site.value = s
}

async function loadGoogleStatus() {
  if (!site.value) return
  try {
    googleStatus.value = await getStatus(site.value.id)
  } catch {
    googleStatus.value = null
  }
}

async function loadSites() {
  if (!site.value) return
  sitesLoading.value = true
  siteError.value = ''
  sitesHint.value = ''
  try {
    const res = await getGscSites(site.value.id)
    sites.value = res.sites ?? []
    if (sites.value.length && !siteSelectUrl.value) {
      siteSelectUrl.value = sites.value[0].siteUrl
    }
  } catch (e) {
    siteError.value = getApiErrorMessage(e)
  } finally {
    sitesLoading.value = false
  }
}

async function saveSite() {
  if (!site.value || !siteSelectUrl.value) return
  siteSaving.value = true
  siteError.value = ''
  try {
    await selectGscSite(site.value.id, siteSelectUrl.value, siteSelectUrl.value)
    await loadGoogleStatus()
  } catch (e) {
    siteError.value = e instanceof Error ? e.message : 'Failed to save property'
  } finally {
    siteSaving.value = false
  }
}

async function loadReport() {
  if (!site.value) return
  const { startDate, endDate } = dateRangeFromPreset(rangePreset.value)
  reportLoading.value = true
  reportError.value = ''
  reportSummary.value = null
  reportRows.value = []
  try {
    const res = await getGscReport(site.value.id, startDate, endDate)
    reportSummary.value = res.summary ?? null
    reportRows.value = res.rows ?? []
  } catch (e) {
    reportError.value = getApiErrorMessage(e)
  } finally {
    reportLoading.value = false
  }
}

async function loadQueries() {
  if (!site.value) return
  const { startDate, endDate } = dateRangeFromPreset(rangePreset.value)
  queriesLoading.value = true
  queriesError.value = ''
  queriesRows.value = []
  try {
    const res = await getGscReportQueries(site.value.id, startDate, endDate)
    queriesRows.value = res.rows ?? []
  } catch (e) {
    queriesError.value = getApiErrorMessage(e)
  } finally {
    queriesLoading.value = false
  }
}

async function loadPages() {
  if (!site.value) return
  const { startDate, endDate } = dateRangeFromPreset(rangePreset.value)
  pagesLoading.value = true
  pagesError.value = ''
  pagesRows.value = []
  try {
    const res = await getGscReportPages(site.value.id, startDate, endDate)
    pagesRows.value = res.rows ?? []
  } catch (e) {
    pagesError.value = getApiErrorMessage(e)
  } finally {
    pagesLoading.value = false
  }
}

async function handleChangeSite() {
  if (!site.value) return
  changingSite.value = true
  try {
    await clearGscSite(site.value.id)
    await loadGoogleStatus()
  } finally {
    changingSite.value = false
  }
}

async function handleDisconnect() {
  if (!site.value) return
  disconnecting.value = true
  try {
    await disconnect(site.value.id)
    await loadGoogleStatus()
  } finally {
    disconnecting.value = false
  }
}

async function handleReconnectGoogle() {
  if (!site.value) return
  reconnecting.value = true
  try {
    const url = await getAuthUrl(site.value.id, true)
    if (url) window.location.href = url
  } finally {
    reconnecting.value = false
  }
}

async function init() {
  pending.value = true
  try {
    await loadSite()
    await loadGoogleStatus()
    if (route.query.google === 'connected') {
      googleConnectedToast.value = true
      if (typeof window !== 'undefined') window.history.replaceState({}, '', route.path)
      setTimeout(() => { googleConnectedToast.value = false }, 8000)
      await loadGoogleStatus()
      await loadSites()
    }
  } finally {
    pending.value = false
  }
}

watch(
  () => showSiteSelection.value && !pending.value && site.value,
  (shouldLoad) => {
    if (shouldLoad && sites.value.length === 0 && !sitesLoading.value) {
      loadSites()
    }
  },
  { immediate: true }
)

watch(
  () => [showReports.value, rangePreset.value, siteId.value] as const,
  ([show]) => {
    if (show && site.value?.id === siteId.value) {
      loadReport()
      loadQueries()
      loadPages()
    }
  },
  { immediate: true }
)

watch(
  () => reportRows.value,
  () => {
    nextTick(() => renderClicksChart())
  },
  { deep: true }
)

onMounted(() => init())
watch(siteId, () => init())
onUnmounted(() => clicksChart?.dispose())
</script>
