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
        <h1 class="text-2xl font-semibold text-surface-900">Bing Webmaster Tools</h1>
        <p class="mt-1 text-sm text-surface-500">
          View crawl and search performance from Bing Webmaster for this site. If your site matches a Bing site, it’s selected automatically.
        </p>
      </div>

      <div
        v-if="configLoaded && !configured"
        class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800"
      >
        <p class="font-medium">Bing Webmaster Tools is not configured.</p>
        <p class="mt-1 text-sm">Add your API key in the Integrations section (click Configure on the Bing Webmaster card).</p>
        <NuxtLink :to="`/sites/${site.id}`" class="mt-4 inline-block text-sm font-medium underline">
          Go to {{ site.name }} →
        </NuxtLink>
      </div>

      <template v-else-if="configured">
        <!-- Only show dropdown when there’s no single clear match to the current site’s domain -->
        <section v-if="showSiteDropdown" class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
          <h2 class="mb-3 text-lg font-medium text-surface-900">Select a site</h2>
          <p class="mb-3 text-sm text-surface-500">No single match for {{ site?.domain }} in your Bing Webmaster account. Choose which site to show:</p>
          <p v-if="sitesError" class="mb-3 text-sm text-red-600">{{ sitesError }}</p>
          <p v-else-if="sitesLoading && !sites.length" class="mb-3 text-sm text-surface-500">Loading sites…</p>
          <select
            v-else-if="sites.length"
            v-model="selectedSiteUrl"
            class="w-full max-w-xl rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            :disabled="dataLoading"
            @change="onSiteChange"
          >
            <option value="">
              — Choose a Bing Webmaster site —
            </option>
            <option v-for="(s, i) in sites" :key="i" :value="s.url">
              {{ s.url }} {{ s.isVerified ? '✓' : '' }}
            </option>
          </select>
          <p v-else class="text-sm text-surface-500">No sites in your Bing Webmaster account.</p>
        </section>
        <p v-else-if="selectedSiteUrl" class="mb-4 text-sm text-surface-600">
          Showing data for <span class="font-medium">{{ selectedSiteUrl }}</span>
        </p>

        <template v-if="selectedSiteUrl && !dataError">
          <div v-if="dataLoading" class="rounded-xl border border-surface-200 bg-surface-50 p-8 text-center text-surface-500">
            Loading Bing data…
          </div>

          <template v-else-if="bingData">
            <!-- Date range -->
            <section class="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-surface-200 bg-surface-50 px-4 py-3">
              <span class="text-sm font-medium text-surface-700">Date range</span>
              <input
                v-model="dateRangeStart"
                type="date"
                class="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <span class="text-surface-400">to</span>
              <input
                v-model="dateRangeEnd"
                type="date"
                class="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="preset in datePresets"
                  :key="preset.label"
                  type="button"
                  class="rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-sm font-medium text-surface-600 hover:bg-surface-100"
                  @click="applyDatePreset(preset)"
                >
                  {{ preset.label }}
                </button>
              </div>
            </section>

            <!-- Search performance (clicks & impressions – at top) + Top queries -->
            <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
              <h3 class="mb-4 text-lg font-medium text-surface-900">Search performance</h3>
              <p v-if="!bingData.queryStats.length" class="text-sm text-surface-500">No query data for this site.</p>
              <template v-else>
                <div class="mb-4 flex flex-wrap items-center gap-6 text-sm">
                  <span class="font-medium text-surface-700">Total Clicks: {{ filteredTotalClicks }}</span>
                  <span class="font-medium text-surface-700">Total Impressions: {{ filteredTotalImpressions }}</span>
                  <span v-if="filteredTotalImpressions > 0" class="text-surface-600">CTR: {{ ((filteredTotalClicks / filteredTotalImpressions) * 100).toFixed(2) }}%</span>
                </div>
                <div ref="performanceChartEl" class="h-[300px] w-full" />
                <h4 class="mt-8 mb-3 text-base font-medium text-surface-900">Top queries</h4>
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-surface-200 text-sm">
                    <thead class="bg-surface-50">
                      <tr>
                        <th
                          class="cursor-pointer select-none px-4 py-2 text-left font-medium text-surface-600 hover:bg-surface-100"
                          :class="{ 'text-primary-600': querySortBy === 'query' }"
                          @click="setQuerySort('query')"
                        >
                          Query {{ sortIcon('query') }}
                        </th>
                        <th
                          class="cursor-pointer select-none px-4 py-2 text-right font-medium text-surface-600 hover:bg-surface-100"
                          :class="{ 'text-primary-600': querySortBy === 'clicks' }"
                          @click="setQuerySort('clicks')"
                        >
                          Clicks {{ sortIcon('clicks') }}
                        </th>
                        <th
                          class="cursor-pointer select-none px-4 py-2 text-right font-medium text-surface-600 hover:bg-surface-100"
                          :class="{ 'text-primary-600': querySortBy === 'impressions' }"
                          @click="setQuerySort('impressions')"
                        >
                          Impressions {{ sortIcon('impressions') }}
                        </th>
                        <th
                          class="cursor-pointer select-none px-4 py-2 text-right font-medium text-surface-600 hover:bg-surface-100"
                          :class="{ 'text-primary-600': querySortBy === 'avgPosition' }"
                          @click="setQuerySort('avgPosition')"
                        >
                          Avg position {{ sortIcon('avgPosition') }}
                        </th>
                        <th
                          class="cursor-pointer select-none px-4 py-2 text-left font-medium text-surface-600 hover:bg-surface-100"
                          :class="{ 'text-primary-600': querySortBy === 'date' }"
                          @click="setQuerySort('date')"
                        >
                          Date {{ sortIcon('date') }}
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-surface-200">
                      <tr v-for="(row, i) in sortedQueryStats.slice(0, 100)" :key="i" class="hover:bg-surface-50/50">
                        <td class="px-4 py-2 text-surface-800">{{ row.Query ?? '—' }}</td>
                        <td class="px-4 py-2 text-right">{{ row.Clicks ?? '—' }}</td>
                        <td class="px-4 py-2 text-right">{{ row.Impressions ?? '—' }}</td>
                        <td class="px-4 py-2 text-right">{{ row.AvgImpressionPosition != null ? row.AvgImpressionPosition.toFixed(1) : '—' }}</td>
                        <td class="px-4 py-2 text-surface-600">{{ formatBingDate(row.Date) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-if="sortedQueryStats.length > 100" class="mt-2 text-xs text-surface-500">
                  Showing first 100 of {{ sortedQueryStats.length }} rows.
                </p>
              </template>
            </section>

            <!-- Crawl stats (visual) -->
            <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
              <h3 class="mb-2 text-lg font-medium text-surface-900">Crawl stats</h3>
              <p class="mb-4 text-sm text-surface-500">
                How Bing discovers and indexes your site. Numbers are reported per day for the selected range.
              </p>
              <p v-if="!bingData.crawlStats.length" class="text-sm text-surface-500">No crawl data for this site.</p>
              <template v-else>
                <!-- Summary cards: latest values so the numbers mean something at a glance -->
                <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <div class="rounded-lg border border-surface-200 bg-surface-50/80 p-3">
                    <p class="text-xs font-medium uppercase tracking-wide text-surface-500">In index</p>
                    <p class="mt-0.5 text-xl font-semibold text-surface-900">{{ crawlSummary.latestInIndex }}</p>
                    <p class="mt-1 text-xs text-surface-500">Pages in Bing’s search index</p>
                  </div>
                  <div class="rounded-lg border border-surface-200 bg-surface-50/80 p-3">
                    <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Crawled</p>
                    <p class="mt-0.5 text-xl font-semibold text-surface-900">{{ crawlSummary.latestCrawled }}</p>
                    <p class="mt-1 text-xs text-surface-500">Pages Bing crawled that day</p>
                  </div>
                  <div class="rounded-lg border border-surface-200 bg-surface-50/80 p-3">
                    <p class="text-xs font-medium uppercase tracking-wide text-surface-500">In links</p>
                    <p class="mt-0.5 text-xl font-semibold text-surface-900">{{ crawlSummary.latestInLinks }}</p>
                    <p class="mt-1 text-xs text-surface-500">URLs known via links</p>
                  </div>
                  <div class="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3">
                    <p class="text-xs font-medium uppercase tracking-wide text-emerald-700">2xx</p>
                    <p class="mt-0.5 text-xl font-semibold text-emerald-900">{{ crawlSummary.latest2xx }}</p>
                    <p class="mt-1 text-xs text-emerald-600">Pages that returned OK</p>
                  </div>
                  <div class="rounded-lg border border-amber-200 bg-amber-50/80 p-3">
                    <p class="text-xs font-medium uppercase tracking-wide text-amber-700">4xx</p>
                    <p class="mt-0.5 text-xl font-semibold text-amber-900">{{ crawlSummary.latest4xx }}</p>
                    <p class="mt-1 text-xs text-amber-600">Client errors (e.g. 404)</p>
                  </div>
                  <div class="rounded-lg border border-red-200 bg-red-50/80 p-3">
                    <p class="text-xs font-medium uppercase tracking-wide text-red-700">5xx</p>
                    <p class="mt-0.5 text-xl font-semibold text-red-900">{{ crawlSummary.latest5xx }}</p>
                    <p class="mt-1 text-xs text-red-600">Server errors</p>
                  </div>
                </div>
                <p class="mb-3 text-xs text-surface-500">
                  Summary above shows the most recent day in your date range. Chart and table below show the full trend.
                </p>
                <div ref="crawlChartEl" class="h-[320px] w-full" />
                <div class="mt-4 overflow-x-auto">
                  <table class="min-w-full divide-y divide-surface-200 text-sm">
                    <thead class="bg-surface-50">
                      <tr>
                        <th class="px-4 py-2 text-left font-medium text-surface-600">Date</th>
                        <th class="px-4 py-2 text-right font-medium text-surface-600" title="Pages in Bing's search index">In index</th>
                        <th class="px-4 py-2 text-right font-medium text-surface-600" title="Pages Bing crawled that day">Crawled</th>
                        <th class="px-4 py-2 text-right font-medium text-surface-600" title="URLs discovered via links">In links</th>
                        <th class="px-4 py-2 text-right font-medium text-surface-600" title="Pages that returned HTTP 2xx (success)">2xx</th>
                        <th class="px-4 py-2 text-right font-medium text-surface-600" title="Pages that returned HTTP 4xx (e.g. 404)">4xx</th>
                        <th class="px-4 py-2 text-right font-medium text-surface-600" title="Pages that returned HTTP 5xx (server error)">5xx</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-surface-200">
                      <tr v-for="(row, i) in filteredCrawlStats" :key="i" class="hover:bg-surface-50/50">
                        <td class="px-4 py-2 text-surface-800">{{ formatBingDate(row.Date) }}</td>
                        <td class="px-4 py-2 text-right">{{ row.InIndex ?? '—' }}</td>
                        <td class="px-4 py-2 text-right">{{ row.CrawledPages ?? '—' }}</td>
                        <td class="px-4 py-2 text-right">{{ row.InLinks ?? '—' }}</td>
                        <td class="px-4 py-2 text-right text-emerald-700">{{ row.Code2xx ?? '—' }}</td>
                        <td class="px-4 py-2 text-right text-amber-700">{{ row.Code4xx ?? '—' }}</td>
                        <td class="px-4 py-2 text-right text-red-700">{{ row.Code5xx ?? '—' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </section>
          </template>
        </template>

        <p v-if="dataError" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {{ dataError }}
        </p>
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
import { getSite } from '~/services/sites'

interface BingSiteItem {
  url: string
  isVerified: boolean
}

interface CrawlStatsItem {
  Date?: string
  Code2xx?: number
  Code4xx?: number
  Code5xx?: number
  CrawledPages?: number
  InIndex?: number
  InLinks?: number
  [key: string]: unknown
}

interface QueryStatsItem {
  Query?: string
  Date?: string
  Clicks?: number
  Impressions?: number
  AvgImpressionPosition?: number
  [key: string]: unknown
}

interface BingDataResponse {
  siteUrl: string
  crawlStats: CrawlStatsItem[]
  queryStats: QueryStatsItem[]
}

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()

const site = ref<SiteRecord | null>(null)
const configLoaded = ref(false)
const configured = ref(false)
const pending = ref(true)
const sites = ref<BingSiteItem[]>([])
const sitesLoading = ref(false)
const sitesError = ref('')
const selectedSiteUrl = ref('')
const bingData = ref<BingDataResponse | null>(null)
const dataLoading = ref(false)
const dataError = ref('')
const showSiteDropdown = ref(true)
const crawlChartEl = ref<HTMLElement | null>(null)
const performanceChartEl = ref<HTMLElement | null>(null)
const querySortBy = ref<'query' | 'clicks' | 'impressions' | 'avgPosition' | 'date'>('clicks')
const querySortDir = ref<'asc' | 'desc'>('desc')

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const today = toYMD(new Date())
const threeMonthsAgo = toYMD(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
const dateRangeStart = ref(threeMonthsAgo)
const dateRangeEnd = ref(today)
const datePresets = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: 'All', days: null as number | null },
]
function applyDatePreset(p: { label: string; days: number | null }) {
  dateRangeEnd.value = today
  if (p.days == null) {
    const crawl = bingData.value?.crawlStats ?? []
    const query = bingData.value?.queryStats ?? []
    const dates = [...crawl.map((r) => parseBingDate(r.Date)), ...query.map((r) => parseBingDate(r.Date))].filter(Boolean)
    const min = dates.length ? Math.min(...dates) : Date.now() - 365 * 24 * 60 * 60 * 1000
    dateRangeStart.value = toYMD(new Date(min))
  } else {
    dateRangeStart.value = toYMD(new Date(Date.now() - p.days * 24 * 60 * 60 * 1000))
  }
}

/** Start/end of selected range as start-of-day timestamps for filtering. */
const dateRangeMs = computed(() => {
  const start = new Date(dateRangeStart.value).setHours(0, 0, 0, 0)
  const end = new Date(dateRangeEnd.value).setHours(23, 59, 59, 999)
  return { start: Number.isNaN(start) ? 0 : start, end: Number.isNaN(end) ? 0 : end }
})

let crawlChart: import('echarts').ECharts | null = null
let performanceChart: import('echarts').ECharts | null = null

const sortedCrawlStats = computed(() => {
  const list = bingData.value?.crawlStats ?? []
  return [...list].sort((a, b) => {
    const da = parseBingDate(a.Date)
    const db = parseBingDate(b.Date)
    return da - db
  })
})

const filteredCrawlStats = computed(() => {
  const { start, end } = dateRangeMs.value
  if (!start || !end) return sortedCrawlStats.value
  return sortedCrawlStats.value.filter((r) => {
    const ms = parseBingDate(r.Date)
    return ms >= start && ms <= end
  })
})

/** Latest crawl row in the filtered range (most recent day) for summary cards. */
const crawlSummary = computed(() => {
  const list = filteredCrawlStats.value
  const row = list.length ? list[list.length - 1] : null
  return {
    latestInIndex: row?.InIndex ?? '—',
    latestCrawled: row?.CrawledPages ?? '—',
    latestInLinks: row?.InLinks ?? '—',
    latest2xx: row?.Code2xx ?? '—',
    latest4xx: row?.Code4xx ?? '—',
    latest5xx: row?.Code5xx ?? '—',
  }
})

/** Aggregate query stats by calendar day for clicks/impressions chart. */
const performanceByDate = computed(() => {
  const list = bingData.value?.queryStats ?? []
  const byDay = new Map<number, { clicks: number; impressions: number }>()
  for (const row of list) {
    const ms = parseBingDate(row.Date)
    if (!ms) continue
    const dayStart = new Date(ms).setHours(0, 0, 0, 0)
    const cur = byDay.get(dayStart) ?? { clicks: 0, impressions: 0 }
    cur.clicks += Number(row.Clicks) || 0
    cur.impressions += Number(row.Impressions) || 0
    byDay.set(dayStart, cur)
  }
  return Array.from(byDay.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date - b.date)
})

const filteredPerformanceByDate = computed(() => {
  const { start, end } = dateRangeMs.value
  if (!start || !end) return performanceByDate.value
  return performanceByDate.value.filter((d) => d.date >= start && d.date <= end)
})

const filteredTotalClicks = computed(() => filteredPerformanceByDate.value.reduce((s, d) => s + d.clicks, 0))
const filteredTotalImpressions = computed(() => filteredPerformanceByDate.value.reduce((s, d) => s + d.impressions, 0))

const filteredQueryStats = computed(() => {
  const list = bingData.value?.queryStats ?? []
  const { start, end } = dateRangeMs.value
  if (!start || !end) return list
  return list.filter((r) => {
    const ms = parseBingDate(r.Date)
    return ms >= start && ms <= end
  })
})

const sortedQueryStats = computed(() => {
  const list = [...filteredQueryStats.value]
  const by = querySortBy.value
  const dir = querySortDir.value
  const mult = dir === 'asc' ? 1 : -1
  list.sort((a, b) => {
    switch (by) {
      case 'query': {
        const va = String(a.Query ?? '').toLowerCase()
        const vb = String(b.Query ?? '').toLowerCase()
        return mult * (va < vb ? -1 : va > vb ? 1 : 0)
      }
      case 'clicks': {
        const va = Number(a.Clicks) || 0
        const vb = Number(b.Clicks) || 0
        return mult * (va - vb)
      }
      case 'impressions': {
        const va = Number(a.Impressions) || 0
        const vb = Number(b.Impressions) || 0
        return mult * (va - vb)
      }
      case 'avgPosition': {
        const va = Number(a.AvgImpressionPosition) || 0
        const vb = Number(b.AvgImpressionPosition) || 0
        return mult * (va - vb)
      }
      case 'date': {
        const va = parseBingDate(a.Date)
        const vb = parseBingDate(b.Date)
        return mult * (va - vb)
      }
      default:
        return 0
    }
  })
  return list
})

function setQuerySort(column: 'query' | 'clicks' | 'impressions' | 'avgPosition' | 'date') {
  if (querySortBy.value === column) {
    querySortDir.value = querySortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    querySortBy.value = column
    querySortDir.value = column === 'query' ? 'asc' : 'desc'
  }
}

function sortIcon(column: 'query' | 'clicks' | 'impressions' | 'avgPosition' | 'date') {
  if (querySortBy.value !== column) return ''
  return querySortDir.value === 'asc' ? '↑' : '↓'
}

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Normalize URL or domain for matching: no protocol, no www, no trailing slash, lowercase. */
function normalizeForMatch(urlOrDomain: string): string {
  return (urlOrDomain || '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '')
    .toLowerCase()
    .trim()
}

/** Find Bing site URL that matches the current WRR site’s domain. Returns URL if exactly one match, else null. */
function findMatchingBingSiteUrl(wrrDomain: string, bingSites: BingSiteItem[]): string | null {
  const normalized = normalizeForMatch(wrrDomain)
  if (!normalized || !bingSites.length) return null
  const matches = bingSites.filter((s) => normalizeForMatch(s.url) === normalized)
  return matches.length === 1 ? matches[0].url : null
}

/** Parse Bing /Date(1316156400000-0700)/ or similar. */
function parseBingDate(val: string | undefined): number {
  if (!val) return 0
  const m = val.match(/\/Date\((\d+)/)
  if (m) return Number(m[1])
  const d = new Date(val)
  return Number.isNaN(d.getTime()) ? 0 : d.getTime()
}

function formatBingDate(val: string | undefined): string {
  const ms = parseBingDate(val)
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

async function loadSite() {
  site.value = await getSite(pb, siteId.value)
}

async function loadConfig() {
  if (!site.value) return
  try {
    const res = await $fetch<{ configured: boolean }>('/api/bing-webmaster/config', {
      query: { siteId: site.value.id },
      headers: authHeaders(),
    })
    configured.value = res.configured
  } catch {
    configured.value = false
  } finally {
    configLoaded.value = true
  }
}

async function loadSites() {
  if (!site.value || !configured.value) return
  sitesError.value = ''
  sitesLoading.value = true
  try {
    const res = await $fetch<{ sites: BingSiteItem[] }>(`/api/sites/${site.value.id}/bing-webmaster/sites`, {
      headers: authHeaders(),
    })
    const list = res.sites ?? []
    sites.value = list
    const match = findMatchingBingSiteUrl(site.value.domain, list)
    if (match) {
      selectedSiteUrl.value = match
      showSiteDropdown.value = false
      await loadData()
    } else {
      showSiteDropdown.value = true
      if (list.length && !selectedSiteUrl.value) {
        const verified = list.find((s) => s.isVerified)
        selectedSiteUrl.value = verified?.url ?? list[0].url
        await loadData()
      }
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    sitesError.value = err?.data?.message ?? err?.message ?? 'Failed to load sites.'
  } finally {
    sitesLoading.value = false
  }
}

async function loadData() {
  if (!site.value || !selectedSiteUrl.value) return
  dataError.value = ''
  dataLoading.value = true
  bingData.value = null
  try {
    bingData.value = await $fetch<BingDataResponse>(
      `/api/sites/${site.value.id}/bing-webmaster/data`,
      {
        query: { siteUrl: selectedSiteUrl.value },
        headers: authHeaders(),
      }
    )
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    dataError.value = err?.data?.message ?? err?.message ?? 'Failed to load Bing data.'
  } finally {
    dataLoading.value = false
  }
}

function onSiteChange() {
  if (selectedSiteUrl.value) loadData()
  else {
    bingData.value = null
    dataError.value = ''
  }
}

async function init() {
  pending.value = true
  try {
    await loadSite()
    if (site.value) {
      await loadConfig()
      if (configured.value) await loadSites()
    }
  } finally {
    pending.value = false
  }
}

function renderCrawlChart() {
  const stats = filteredCrawlStats.value
  if (!crawlChartEl.value || !stats.length) return
  const dates = stats.map((r) => formatBingDate(r.Date))
  import('echarts').then((echarts) => {
    if (crawlChart) crawlChart.dispose()
    crawlChart = echarts.init(crawlChartEl.value!)
    crawlChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, data: ['In index', 'Crawled', 'In links', '2xx (OK)', '4xx (errors)', '5xx (errors)'] },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: dates, boundaryGap: false },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        { name: 'In index', type: 'line', smooth: true, data: stats.map((r) => r.InIndex ?? 0), itemStyle: { color: '#059669' } },
        { name: 'Crawled', type: 'line', smooth: true, data: stats.map((r) => r.CrawledPages ?? 0), itemStyle: { color: '#2563eb' } },
        { name: 'In links', type: 'line', smooth: true, data: stats.map((r) => r.InLinks ?? 0), itemStyle: { color: '#7c3aed' } },
        { name: '2xx (OK)', type: 'line', smooth: true, data: stats.map((r) => r.Code2xx ?? 0), itemStyle: { color: '#65a30d' } },
        { name: '4xx (errors)', type: 'line', smooth: true, data: stats.map((r) => r.Code4xx ?? 0), itemStyle: { color: '#ea580c' } },
        { name: '5xx (errors)', type: 'line', smooth: true, data: stats.map((r) => r.Code5xx ?? 0), itemStyle: { color: '#dc2626' } },
      ],
    })
  })
}

function renderPerformanceChart() {
  const data = filteredPerformanceByDate.value
  if (!performanceChartEl.value || !data.length) return
  const dates = data.map((d) => new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }))
  import('echarts').then((echarts) => {
    if (performanceChart) performanceChart.dispose()
    performanceChart = echarts.init(performanceChartEl.value!)
    performanceChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, data: ['Clicks', 'Impressions'] },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: dates, boundaryGap: false },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        { name: 'Clicks', type: 'line', smooth: true, data: data.map((d) => d.clicks), itemStyle: { color: '#2563eb' } },
        { name: 'Impressions', type: 'line', smooth: true, data: data.map((d) => d.impressions), itemStyle: { color: '#7c3aed' } },
      ],
    })
  })
}

onMounted(() => init())
watch(siteId, () => init())
watch([filteredCrawlStats, crawlChartEl], () => renderCrawlChart(), { flush: 'post' })
watch([filteredPerformanceByDate, performanceChartEl], () => renderPerformanceChart(), { flush: 'post' })

onUnmounted(() => {
  crawlChart?.dispose()
  performanceChart?.dispose()
})
</script>
