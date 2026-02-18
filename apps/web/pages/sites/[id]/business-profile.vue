<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <ClientOnly>
      <template #fallback>
        <div class="flex justify-center py-12"><p class="text-surface-500">Loading…</p></div>
      </template>
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
        <!-- Required APIs (same GCP project as Google OAuth) -->
        <section class="mb-6 rounded-xl border border-surface-200 bg-white p-4">
          <h2 class="mb-2 text-sm font-semibold text-surface-800">Required Google Cloud APIs</h2>
          <p class="mb-3 text-sm text-surface-600">In the same Google Cloud project used for OAuth, enable both APIs below. Then reconnect Google on Integrations if you just enabled them.</p>
          <ul class="list-inside list-disc space-y-1 text-sm text-surface-700">
            <li>
              <a href="https://console.cloud.google.com/apis/library/mybusinessaccountmanagement.googleapis.com" target="_blank" rel="noopener" class="font-medium text-primary-600 underline">My Business Account Management API</a>
              — lists your Business Profile accounts
            </li>
            <li>
              <a href="https://console.cloud.google.com/apis/library/mybusiness.googleapis.com" target="_blank" rel="noopener" class="font-medium text-primary-600 underline">Google My Business API</a>
              — lists locations under an account
            </li>
          </ul>
          <p class="mt-2 text-xs text-surface-500">If an API is missing or shows 0 quota, you may need to request access from Google (Business Profile API access).</p>
        </section>

        <!-- Location selector -->
        <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6">
          <h2 class="mb-2 text-lg font-medium text-surface-900">Location</h2>
          <p v-if="selectedLocation" class="text-sm text-surface-600">{{ selectedLocation.name }}</p>
          <div class="mt-3 flex flex-wrap items-center gap-3">
            <template v-if="selectedLocation">
              <button
                type="button"
                class="text-sm font-medium text-primary-600 hover:underline"
                :disabled="isInCooldown"
                @click="openLocationPicker"
              >
                Change location
              </button>
            </template>
            <template v-else>
              <button
                type="button"
                class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
                :disabled="accountsLoading || isInCooldown"
                @click="openLocationPicker"
              >
                {{ accountsLoading ? 'Loading…' : isInCooldown ? `Try again in ${cooldownSeconds}s` : 'Choose location' }}
              </button>
            </template>
          </div>
          <div v-if="locationError" class="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p class="font-medium">Can’t load locations</p>
            <p class="mt-1">{{ locationError }}</p>
            <p v-if="isRateLimitError" class="mt-2">Wait about a minute, then try again. Do not reconnect Google.</p>
            <button
              v-if="isRateLimitError"
              type="button"
              class="mt-3 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
              :disabled="isInCooldown"
              @click="openLocationPicker"
            >
              {{ isInCooldown ? `Try again in ${cooldownSeconds}s` : 'Try again' }}
            </button>
            <template v-else>
            <p class="mt-3 font-medium">To fix this, do both steps in order:</p>
            <ol class="mt-2 list-decimal list-inside space-y-2">
              <li>
                <strong>Enable both APIs</strong> in the Google Cloud project used for OAuth:
                <a href="https://console.cloud.google.com/apis/library/mybusinessaccountmanagement.googleapis.com" target="_blank" rel="noopener" class="ml-1 font-medium text-primary-700 underline">My Business Account Management API</a>,
                <a href="https://console.cloud.google.com/apis/library/mybusiness.googleapis.com" target="_blank" rel="noopener" class="font-medium text-primary-700 underline">Google My Business API</a>.
              </li>
              <li>
                Then disconnect Google on <NuxtLink :to="`/sites/${site.id}`" class="font-medium underline">Integrations</NuxtLink>, then click the button below to reconnect and approve <strong>all</strong> permissions on the Google consent screen.
              </li>
            </ol>
            <p class="mt-2 text-xs text-amber-900">Reconnecting without enabling the API first will not fix this.</p>
            <button
              type="button"
              class="mt-3 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
              :disabled="reconnectBusy"
              @click="reconnectWithConsent"
            >
              {{ reconnectBusy ? 'Redirecting…' : 'Reconnect Google (show consent screen)' }}
            </button>
            </template>
          </div>

          <!-- Location picker modal -->
          <div v-if="showLocationSelect" class="mt-4 space-y-4 rounded-lg border border-surface-200 bg-surface-50 p-4">
            <p v-if="locationInfo" class="text-sm text-sky-700">{{ locationInfo }}</p>
            <p v-else-if="accountsLoading" class="text-sm text-surface-600">Loading accounts…</p>
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
    </ClientOnly>
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
  redirectToGoogle,
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
const locationInfo = ref('')
const reconnectBusy = ref(false)

const isRateLimitError = computed(() => {
  const err = locationError.value.toLowerCase()
  return err.includes('rate limit') || err.includes('wait a minute') || err.includes('429')
})

const RATE_LIMIT_COOLDOWN_MS = 65_000
const RATE_LIMIT_STORAGE_KEY = 'gbp_rate_limit_at'

function getStoredRateLimitAt(): number {
  if (typeof sessionStorage === 'undefined') return 0
  try {
    const v = sessionStorage.getItem(RATE_LIMIT_STORAGE_KEY)
    return v ? parseInt(v, 10) : 0
  } catch {
    return 0
  }
}

function setStoredRateLimitAt(t: number) {
  try {
    sessionStorage.setItem(RATE_LIMIT_STORAGE_KEY, String(t))
  } catch {
    /* ignore */
  }
}

const lastRateLimitAt = ref(getStoredRateLimitAt())

const isInCooldown = computed(() => Date.now() - lastRateLimitAt.value < RATE_LIMIT_COOLDOWN_MS)
const cooldownTick = ref(0)
const cooldownSeconds = computed(() => {
  cooldownTick.value
  const elapsed = Date.now() - lastRateLimitAt.value
  if (elapsed >= RATE_LIMIT_COOLDOWN_MS) return 0
  return Math.ceil((RATE_LIMIT_COOLDOWN_MS - elapsed) / 1000)
})

/** Open location picker: use cached accounts if we have them to avoid extra API calls. */
async function openLocationPicker() {
  if (isInCooldown.value) return
  showLocationSelect.value = true
  if (accounts.value.length) {
    if (selectedAccountId.value) await loadLocations(selectedAccountId.value)
    return
  }
  await loadAccounts()
}

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
  if (accountsLoading.value) return
  const now = Date.now()
  const stored = getStoredRateLimitAt()
  if (stored && now - stored < RATE_LIMIT_COOLDOWN_MS) {
    lastRateLimitAt.value = stored
    locationError.value = 'Google Business Profile API rate limit reached. Please wait a minute and try again—no need to reconnect.'
    return
  }
  accountsLoading.value = true
  locationError.value = ''
  locationInfo.value = ''
  try {
    const res = await getGbpAccounts(site.value.id) as { accounts?: Array<{ name: string; id: string; accountName: string; type: string }>; rateLimited?: boolean }
    accounts.value = res.accounts ?? []
    selectedAccountId.value = ''
    locations.value = []
    pickerLocationId.value = ''
    if (res.rateLimited) locationInfo.value = (res.accounts?.length ? 'Rate limited; showing last saved list. You can still choose below.' : 'Rate limited; no list available yet. Wait about a minute and try again.')
    // Don't auto-fetch locations here — one API call per user action to avoid rate limit.
    // Locations load when user selects an account from the dropdown.
  } catch (e: unknown) {
    const err = e as { statusCode?: number; data?: { message?: string }; message?: string }
    const msg = (err?.data?.message || err?.message || (err instanceof Error ? err.message : '') || 'Failed to load accounts.').trim()
    locationError.value = msg
    if (err?.statusCode === 429) {
      lastRateLimitAt.value = Date.now()
      setStoredRateLimitAt(lastRateLimitAt.value)
    }
  } finally {
    accountsLoading.value = false
  }
}

async function loadLocations(accountId: string) {
  if (!site.value) return
  const now = Date.now()
  const stored = getStoredRateLimitAt()
  if (stored && now - stored < RATE_LIMIT_COOLDOWN_MS) {
    lastRateLimitAt.value = stored
    locationError.value = 'Google Business Profile API rate limit reached. Please wait a minute and try again—no need to reconnect.'
    return
  }
  locationsLoading.value = true
  locationError.value = ''
  locationInfo.value = ''
  locations.value = []
  pickerLocationId.value = ''
  try {
    const res = await getGbpLocations(site.value.id, accountId) as { locations?: Array<{ name: string; locationId: string; locationName: string; address: string }>; rateLimited?: boolean }
    locations.value = res.locations ?? []
    if (res.rateLimited) locationInfo.value = (res.locations?.length ? 'Rate limited; showing last saved list. You can still choose a location.' : 'Rate limited; no list available yet. Wait about a minute and try again.')
  } catch (e: unknown) {
    const err = e as { statusCode?: number; data?: { message?: string }; message?: string }
    const msg = (err?.data?.message || err?.message || (err instanceof Error ? err.message : '') || 'Failed to load locations.').trim()
    locationError.value = msg
    if (err?.statusCode === 429) {
      lastRateLimitAt.value = Date.now()
      setStoredRateLimitAt(lastRateLimitAt.value)
    }
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

async function reconnectWithConsent() {
  if (!site.value) return
  reconnectBusy.value = true
  try {
    const result = await redirectToGoogle(site.value.id, true)
    if (!result.ok) locationError.value = result.message
  } finally {
    reconnectBusy.value = false
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

let cooldownInterval: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  init()
  cooldownInterval = setInterval(() => {
    cooldownTick.value += 1
  }, 1000)
})
watch(siteId, () => init())

onUnmounted(() => {
  if (cooldownInterval) clearInterval(cooldownInterval)
  impressionsChart?.dispose()
  actionsChart?.dispose()
  pieChart?.dispose()
})
</script>
