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
        <h1 class="text-2xl font-semibold text-surface-900">Google Business Profile</h1>
        <p class="mt-1 text-sm text-surface-500">Calls, directions, website clicks, and visibility on Search & Maps.</p>
      </div>

      <div v-if="!googleConnected" class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p class="font-medium">Connect Google to use Business Profile.</p>
        <p class="mt-1 text-sm">Use the Integrations section on the site page to connect your Google account.</p>
        <NuxtLink :to="`/sites/${site.id}`" class="mt-4 inline-block text-sm font-medium underline">Go to {{ site.name }} →</NuxtLink>
      </div>

      <template v-else>
        <!-- Location selector -->
        <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6">
          <h2 class="mb-2 text-lg font-medium text-surface-900">Location</h2>
          <p v-if="selectedLocation" class="text-sm text-surface-600">{{ selectedLocation.name }}</p>
          <div class="mt-3 flex flex-wrap items-center gap-3">
            <template v-if="selectedLocation">
              <button
                type="button"
                class="text-sm font-medium text-primary-600 hover:underline"
                @click="showLocationSelect = true"
              >
                Change location
              </button>
            </template>
            <template v-else>
              <button
                type="button"
                class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
                :disabled="accountsLoading"
                @click="loadAccounts(); showLocationSelect = true"
              >
                {{ accountsLoading ? 'Loading…' : 'Choose location' }}
              </button>
            </template>
          </div>
          <div v-if="locationError" class="mt-2 text-sm text-red-600">{{ locationError }}</div>

          <!-- Location picker modal -->
          <div v-if="showLocationSelect" class="mt-4 space-y-4 rounded-lg border border-surface-200 bg-surface-50 p-4">
            <p class="text-sm font-medium text-surface-700">Select account, then location</p>
            <div class="flex flex-wrap gap-3">
              <select
                v-model="selectedAccountId"
                class="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm"
                @change="selectedAccountId && loadLocations(selectedAccountId)"
              >
                <option value="">— Account —</option>
                <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.accountName || a.id }}</option>
              </select>
              <select
                v-model="pickerLocationId"
                class="min-w-[200px] rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm"
                :disabled="!locations.length"
              >
                <option value="">— Location —</option>
                <option v-for="loc in locations" :key="loc.locationId" :value="loc.locationId">
                  {{ loc.locationName }} {{ loc.address ? `(${loc.address.slice(0, 30)}…)` : '' }}
                </option>
              </select>
              <button
                type="button"
                class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
                :disabled="!pickerLocationId || locationSaving"
                @click="saveLocation"
              >
                {{ locationSaving ? 'Saving…' : 'Use this location' }}
              </button>
              <button
                type="button"
                class="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-700"
                @click="showLocationSelect = false"
              >
                Cancel
              </button>
            </div>
          </div>
        </section>

        <template v-if="selectedLocation">
          <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 class="text-lg font-medium text-surface-900">Insights</h2>
            <select
              v-model="rangePreset"
              class="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900"
            >
              <option value="last_7_days">Last 7 days</option>
              <option value="last_28_days">Last 28 days</option>
              <option value="last_90_days">Last 90 days</option>
            </select>
          </div>

          <div v-if="insightsError" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {{ insightsError }}
          </div>

          <template v-if="insights">
            <!-- Summary cards -->
            <section class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
                <p class="text-sm font-medium text-surface-500">Impressions</p>
                <p class="mt-1 text-2xl font-semibold text-surface-900">{{ summaryImpressions.toLocaleString() }}</p>
              </div>
              <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
                <p class="text-sm font-medium text-surface-500">Call clicks</p>
                <p class="mt-1 text-2xl font-semibold text-surface-900">{{ summaryCalls.toLocaleString() }}</p>
              </div>
              <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
                <p class="text-sm font-medium text-surface-500">Website clicks</p>
                <p class="mt-1 text-2xl font-semibold text-surface-900">{{ summaryWebsite.toLocaleString() }}</p>
              </div>
              <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
                <p class="text-sm font-medium text-surface-500">Direction requests</p>
                <p class="mt-1 text-2xl font-semibold text-surface-900">{{ summaryDirections.toLocaleString() }}</p>
              </div>
              <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
                <p class="text-sm font-medium text-surface-500">Conversations</p>
                <p class="mt-1 text-2xl font-semibold text-surface-900">{{ summaryConversations.toLocaleString() }}</p>
              </div>
            </section>

            <!-- Impressions over time (line chart) -->
            <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6">
              <h3 class="mb-4 text-lg font-medium text-surface-900">Impressions over time</h3>
              <div ref="impressionsChartEl" class="h-[280px] w-full" />
            </section>

            <!-- Actions over time (line chart) -->
            <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6">
              <h3 class="mb-4 text-lg font-medium text-surface-900">Actions over time (calls, website, directions, messages)</h3>
              <div ref="actionsChartEl" class="h-[280px] w-full" />
            </section>

            <!-- Action mix (pie chart) -->
            <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6">
              <h3 class="mb-4 text-lg font-medium text-surface-900">Action mix</h3>
              <div ref="pieChartEl" class="mx-auto h-[280px] w-full max-w-md" />
            </section>
          </template>

          <div v-else-if="!insightsLoading && selectedLocation" class="rounded-xl border border-surface-200 bg-white p-12 text-center text-sm text-surface-500">
            No insights data for this period. Try another date range.
          </div>
        </template>
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

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)

const pb = usePocketbase()
const {
  getStatus,
  getGbpAccounts,
  getGbpLocations,
  selectGbpLocation,
  clearGbpLocation,
  getGbpInsights,
} = useGoogleIntegration()

const site = ref<SiteRecord | null>(null)
const googleStatus = ref<GoogleStatusResponse | null>(null)
const pending = ref(true)
const selectedLocation = computed(() => googleStatus.value?.selectedBusinessProfileLocation ?? null)
const googleConnected = computed(() => googleStatus.value?.connected === true)

const showLocationSelect = ref(false)
const accounts = ref<Array<{ name: string; id: string; accountName: string; type: string }>>([])
const locations = ref<Array<{ name: string; locationId: string; locationName: string; address: string }>>([])
const accountsLoading = ref(false)
const locationsLoading = ref(false)
const selectedAccountId = ref('')
const pickerLocationId = ref('')
const locationSaving = ref(false)
const locationError = ref('')

const rangePreset = ref<'last_7_days' | 'last_28_days' | 'last_90_days'>('last_28_days')
function dateRange(): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  if (rangePreset.value === 'last_7_days') start.setDate(end.getDate() - 6)
  else if (rangePreset.value === 'last_90_days') start.setDate(end.getDate() - 89)
  else start.setDate(end.getDate() - 27)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

const insights = ref<{
  startDate: string
  endDate: string
  totals: Record<string, number>
  rows: Array<Record<string, number | string>>
} | null>(null)
const insightsLoading = ref(false)
const insightsError = ref('')

const summaryImpressions = computed(() => {
  if (!insights.value?.totals) return 0
  const t = insights.value.totals
  return (t.BUSINESS_IMPRESSIONS_DESKTOP_MAPS ?? 0) + (t.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH ?? 0) + (t.BUSINESS_IMPRESSIONS_MOBILE_MAPS ?? 0) + (t.BUSINESS_IMPRESSIONS_MOBILE_SEARCH ?? 0)
})
const summaryCalls = computed(() => insights.value?.totals?.CALL_CLICKS ?? 0)
const summaryWebsite = computed(() => insights.value?.totals?.WEBSITE_CLICKS ?? 0)
const summaryDirections = computed(() => insights.value?.totals?.BUSINESS_DIRECTION_REQUESTS ?? 0)
const summaryConversations = computed(() => insights.value?.totals?.BUSINESS_CONVERSATIONS ?? 0)

const impressionsChartEl = ref<HTMLElement | null>(null)
const actionsChartEl = ref<HTMLElement | null>(null)
const pieChartEl = ref<HTMLElement | null>(null)
let impressionsChart: import('echarts').ECharts | null = null
let actionsChart: import('echarts').ECharts | null = null
let pieChart: import('echarts').ECharts | null = null

async function loadSite() {
  site.value = await getSite(pb, siteId.value)
}

async function loadGoogleStatus() {
  if (!site.value) return
  try {
    googleStatus.value = await getStatus(site.value.id)
  } catch {
    googleStatus.value = null
  }
}

async function loadAccounts() {
  if (!site.value) return
  accountsLoading.value = true
  locationError.value = ''
  try {
    const res = await getGbpAccounts(site.value.id)
    accounts.value = res.accounts ?? []
    if (accounts.value.length) selectedAccountId.value = accounts.value[0].id
    if (selectedAccountId.value) await loadLocations(selectedAccountId.value)
  } catch (e) {
    locationError.value = e instanceof Error ? e.message : 'Failed to load accounts. Reconnect Google and ensure Business Profile scope is granted.'
  } finally {
    accountsLoading.value = false
  }
}

async function loadLocations(accountId: string) {
  if (!site.value) return
  locationsLoading.value = true
  locations.value = []
  pickerLocationId.value = ''
  try {
    const res = await getGbpLocations(site.value.id, accountId)
    locations.value = res.locations ?? []
  } finally {
    locationsLoading.value = false
  }
}

async function saveLocation() {
  if (!site.value || !pickerLocationId.value || !selectedAccountId.value) return
  const loc = locations.value.find((l) => l.locationId === pickerLocationId.value)
  locationSaving.value = true
  locationError.value = ''
  try {
    await selectGbpLocation(site.value.id, selectedAccountId.value, pickerLocationId.value, loc?.locationName)
    await loadGoogleStatus()
    showLocationSelect.value = false
    await loadInsights()
  } catch (e) {
    locationError.value = e instanceof Error ? e.message : 'Failed to save'
  } finally {
    locationSaving.value = false
  }
}

async function loadInsights() {
  if (!site.value || !selectedLocation.value) return
  const { startDate, endDate } = dateRange()
  insightsLoading.value = true
  insightsError.value = ''
  insights.value = null
  try {
    insights.value = await getGbpInsights(site.value.id, startDate, endDate)
    await nextTick()
    renderCharts()
  } catch (e) {
    insightsError.value = e instanceof Error ? e.message : 'Failed to load insights'
  } finally {
    insightsLoading.value = false
  }
}

function renderCharts() {
  const data = insights.value
  if (!data?.rows?.length) return

  const dates = data.rows.map((r) => {
    const d = String(r.date)
    if (d.length >= 10) return d.slice(5, 10).replace('-', '/')
    return d
  })

  const impressionMetrics = [
    'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
    'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
    'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
    'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  ] as const
  const impressionLabels = ['Search (desktop)', 'Maps (desktop)', 'Search (mobile)', 'Maps (mobile)']
  const actionMetrics = ['CALL_CLICKS', 'WEBSITE_CLICKS', 'BUSINESS_DIRECTION_REQUESTS', 'BUSINESS_CONVERSATIONS'] as const
  const actionLabels = ['Calls', 'Website', 'Directions', 'Messages']

  Promise.all([
    (async () => {
      if (!impressionsChartEl.value) return
      const echarts = await import('echarts')
      if (impressionsChart) impressionsChart.dispose()
      impressionsChart = echarts.init(impressionsChartEl.value)
      impressionsChart.setOption({
        grid: { left: 48, right: 24, top: 24, bottom: 32 },
        tooltip: { trigger: 'axis' },
        legend: { top: 0, data: impressionLabels },
        xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: '#e5e7eb' } } },
        series: impressionMetrics.map((m, i) => ({
          name: impressionLabels[i],
          type: 'line',
          data: data.rows.map((r) => Number((r as Record<string, number>)[m]) || 0),
          smooth: true,
          symbol: 'none',
          stack: 'impressions',
          areaStyle: {},
        })),
      })
    })(),
    (async () => {
      if (!actionsChartEl.value) return
      const echarts = await import('echarts')
      if (actionsChart) actionsChart.dispose()
      actionsChart = echarts.init(actionsChartEl.value)
      actionsChart.setOption({
        grid: { left: 48, right: 24, top: 24, bottom: 32 },
        tooltip: { trigger: 'axis' },
        legend: { top: 0, data: actionLabels },
        xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: '#e5e7eb' } } },
        series: actionMetrics.map((m, i) => ({
          name: actionLabels[i],
          type: 'line',
          data: data.rows.map((r) => Number((r as Record<string, number>)[m]) || 0),
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
        })),
      })
    })(),
    (async () => {
      if (!pieChartEl.value) return
      const totalCalls = data.totals.CALL_CLICKS ?? 0
      const totalWebsite = data.totals.WEBSITE_CLICKS ?? 0
      const totalDirections = data.totals.BUSINESS_DIRECTION_REQUESTS ?? 0
      const totalConv = data.totals.BUSINESS_CONVERSATIONS ?? 0
      const pieData = [
        { value: totalCalls, name: 'Calls' },
        { value: totalWebsite, name: 'Website' },
        { value: totalDirections, name: 'Directions' },
        { value: totalConv, name: 'Messages' },
      ].filter((d) => d.value > 0)
      if (pieData.length === 0) return
      const echarts = await import('echarts')
      if (pieChart) pieChart.dispose()
      pieChart = echarts.init(pieChartEl.value)
      pieChart.setOption({
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [
          {
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '45%'],
            data: pieData,
            emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' } },
          },
        ],
      })
    })(),
  ])
}

async function init() {
  pending.value = true
  try {
    await loadSite()
    await loadGoogleStatus()
    if (selectedLocation.value && !showLocationSelect.value) await loadInsights()
  } finally {
    pending.value = false
  }
}

watch(
  () => [selectedLocation.value, rangePreset.value, siteId.value],
  () => {
    if (selectedLocation.value && site.value?.id === siteId.value) loadInsights()
  },
  { immediate: false }
)

onMounted(() => init())
watch(siteId, () => init())

onUnmounted(() => {
  impressionsChart?.dispose()
  actionsChart?.dispose()
  pieChart?.dispose()
})
</script>
