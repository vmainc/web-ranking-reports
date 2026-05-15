<template>
  <SiteIntegrationShell>
      <div v-if="pending" class="flex justify-center py-12">
        <p class="text-slate-400">Loading…</p>
      </div>

      <template v-else-if="site">
        <div class="mb-10">
          <NuxtLink
            :to="`/sites/${site.id}`"
            class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-400 transition hover:text-[#3b82f6]"
          >
            ← {{ site.name }}
          </NuxtLink>
          <h1 class="text-2xl font-bold tracking-tight text-white sm:text-3xl">Google Search Console</h1>
          <p class="mt-1 text-sm text-slate-400">Choose a property and view search performance for this site.</p>
        </div>

        <div
          v-if="googleConnectedToast"
          class="mb-6 rounded-xl border border-[#22c55e]/35 bg-[#22c55e]/10 px-4 py-3 text-sm text-[#86efac]"
        >
          Google connected successfully. Select a Search Console property below to view reports.
        </div>

        <div
          v-if="!showSiteSelection && !showReports && googleStatus && !googleStatus.connected"
          class="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-6 text-amber-100"
        >
          <p class="font-medium">Google Search Console is not connected for this site.</p>
          <p class="mt-1 text-sm text-amber-200/90">Connect Google from the Integrations section on the site page to enable reports.</p>
          <NuxtLink :to="`/sites/${site.id}`" class="mt-4 inline-block text-sm font-semibold text-[#facc15] underline-offset-2 hover:underline">
            Go to {{ site.name }} →
          </NuxtLink>
        </div>

        <section
          v-else-if="showSiteSelection"
          class="mb-10 rounded-2xl border border-slate-700/70 bg-slate-900/50 p-6 shadow-xl ring-1 ring-white/[0.04]"
        >
          <h2 class="mb-2 text-lg font-semibold text-white">Choose your Search Console property</h2>
          <p class="mb-4 text-sm text-slate-400">
            Select which Search Console site (property) to use for reports. We'll load your properties from Google.
          </p>
          <p class="mb-4 text-sm text-slate-400">
            <button
              type="button"
              class="font-semibold text-[#3b82f6] hover:underline disabled:opacity-50"
              :disabled="disconnecting"
              @click="handleDisconnect"
            >
              Use a different Google account
            </button>
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <select
              v-model="siteSelectUrl"
              class="dv-input min-w-[200px] rounded-xl border px-3 py-2 focus:border-[#3b82f6] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/25"
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
              class="rounded-xl bg-gradient-to-r from-[#22c55e] to-[#3b82f6] px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
              @click="loadSites"
            >
              Load properties
            </button>
            <button
              v-else-if="siteSelectUrl"
              type="button"
              class="rounded-xl bg-gradient-to-r from-[#22c55e] to-[#3b82f6] px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50"
              :disabled="siteSaving"
              @click="saveSite"
            >
              {{ siteSaving ? 'Saving…' : 'Use this property' }}
            </button>
          </div>
          <p v-if="sitesHint" class="mt-2 text-sm text-slate-400">{{ sitesHint }}</p>
          <div v-if="siteError" class="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            <p class="font-medium">Could not load properties</p>
            <p class="mt-1">{{ siteError }}</p>
            <p class="mt-2 text-xs text-rose-200/80">Make sure you have access in Search Console. If you just connected, try disconnecting and reconnecting Google to get the right scope.</p>
            <button
              type="button"
              class="mt-3 rounded-lg border border-rose-500/50 bg-rose-500/20 px-3 py-1.5 text-sm font-medium text-rose-100 hover:bg-rose-500/30"
              @click="loadSites"
            >
              Retry
            </button>
          </div>
        </section>

        <template v-else-if="showReports">
          <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-white">Search performance</h2>
              <p class="mt-0.5 text-sm text-slate-400">
                Property: {{ googleStatus.selectedSearchConsoleSite?.name }}
              </p>
              <p v-if="googleStatus.email" class="mt-0.5 text-sm text-slate-400">
                Connected as: {{ googleStatus.email }}
              </p>
              <p class="mt-1 text-sm text-slate-400">
                <button
                  type="button"
                  class="font-semibold text-[#3b82f6] hover:underline disabled:opacity-50"
                  :disabled="changingSite || disconnecting"
                  @click="handleChangeSite"
                >
                  Change property
                </button>
                <span class="text-slate-600"> · </span>
                <button
                  type="button"
                  class="font-semibold text-[#3b82f6] hover:underline disabled:opacity-50"
                  :disabled="changingSite || disconnecting"
                  @click="handleDisconnect"
                >
                  Use a different Google account
                </button>
                <span class="text-slate-600"> · </span>
                <button
                  type="button"
                  class="font-semibold text-[#3b82f6] hover:underline disabled:opacity-50"
                  :disabled="reconnecting"
                  @click="handleReconnectGoogle"
                >
                  {{ reconnecting ? 'Opening…' : 'Reconnect Google (fix 403)' }}
                </button>
              </p>
            </div>
            <select
              v-model="rangePreset"
              class="dv-input shrink-0 rounded-xl border px-3 py-2 text-sm"
            >
              <option value="last_7_days">Last 7 days</option>
              <option value="last_28_days">Last 28 days</option>
              <option value="last_90_days">Last 90 days</option>
            </select>
          </div>

          <div
            v-if="showReconnectBanner"
            class="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-100"
          >
            <p class="mb-2 text-sm font-medium">
              Search Console returned 403 for property: {{ googleStatus.selectedSearchConsoleSite?.name || '—' }}
            </p>
            <p class="mb-2 text-sm text-amber-200/90">
              <strong>Quick check:</strong> Click <strong>Change property</strong>. Does the list of properties load? If <strong>yes</strong> — re-select your property and save. If <strong>no</strong> (list empty or error) — the connected account doesn’t have Search Console access; use <strong>Use a different Google account</strong> and sign in with the account that is <strong>Owner</strong> or has <strong>Full</strong> access in <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" class="font-semibold text-[#facc15] underline">Search Console</a> → Settings → Users and permissions.
            </p>
            <p class="mb-3 text-sm text-amber-200/90">
              Reconnecting the same account only refreshes the token; it does not grant access to a property. The Google account you connect must already have that property in Search Console.
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="rounded-xl border border-amber-400/50 bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
                :disabled="changingSite"
                @click="handleChangeSite"
              >
                Change property
              </button>
              <button
                type="button"
                class="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                :disabled="reconnecting"
                @click="handleReconnectGoogle"
              >
                {{ reconnecting ? 'Opening…' : 'Reconnect Google' }}
              </button>
              <button
                type="button"
                class="rounded-xl border border-amber-400/50 bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
                :disabled="disconnecting"
                @click="handleDisconnect"
              >
                Use a different Google account
              </button>
            </div>
          </div>

          <section class="mb-8 rounded-2xl border border-slate-700/70 bg-slate-900/40 p-6 shadow-xl shadow-black/15 ring-1 ring-white/[0.04]">
            <p class="mb-4 text-sm text-slate-400">{{ rangeSubtitle }}</p>
            <p v-if="reportError" class="mb-4 text-sm text-rose-400">{{ reportError }}</p>
            <div v-if="reportLoading" class="py-12 text-center text-sm text-slate-500">Loading…</div>

            <template v-else>
              <div v-if="reportSummary" class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <article class="gsc-stat relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/50 p-5 shadow-lg shadow-black/20">
                  <div class="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#22c55e] opacity-30 blur-2xl" />
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Clicks</p>
                  <p class="mt-2 text-3xl font-bold tabular-nums text-white">{{ reportSummary.clicks.toLocaleString() }}</p>
                </article>
                <article class="gsc-stat relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/50 p-5 shadow-lg shadow-black/20">
                  <div class="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#3b82f6] opacity-30 blur-2xl" />
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Impressions</p>
                  <p class="mt-2 text-3xl font-bold tabular-nums text-white">{{ reportSummary.impressions.toLocaleString() }}</p>
                </article>
                <article class="gsc-stat relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/50 p-5 shadow-lg shadow-black/20">
                  <div class="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#8b5cf6] opacity-30 blur-2xl" />
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">CTR</p>
                  <p class="mt-2 text-3xl font-bold tabular-nums text-white">{{ (reportSummary.ctr * 100).toFixed(2) }}%</p>
                </article>
                <article class="gsc-stat relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/50 p-5 shadow-lg shadow-black/20">
                  <div class="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#facc15] opacity-30 blur-2xl" />
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Avg position</p>
                  <p class="mt-2 text-3xl font-bold tabular-nums text-white">{{ reportSummary.position.toFixed(1) }}</p>
                </article>
              </div>

              <div v-if="reportRows.length" class="rounded-xl border border-slate-700/50 bg-slate-950/40 p-4">
                <h3 class="mb-3 text-sm font-bold uppercase tracking-wide text-[#3b82f6]">Clicks over time</h3>
                <div ref="clicksChartEl" class="h-[280px] w-full" />
              </div>
              <p v-else-if="!reportError" class="py-6 text-center text-sm text-slate-500">No data for this period.</p>
            </template>
          </section>

          <section class="mb-8 rounded-2xl border border-slate-700/70 bg-slate-900/40 p-6 shadow-xl shadow-black/15 ring-1 ring-white/[0.04]">
            <h3 class="mb-2 text-lg font-semibold text-white">Top queries (keywords)</h3>
            <p class="mb-4 text-sm text-slate-400">Search terms that drove clicks and impressions for this property in the selected period.</p>
            <p v-if="queriesError" class="mb-4 text-sm text-rose-400">{{ queriesError }}</p>
            <div v-if="queriesLoading" class="py-8 text-center text-sm text-slate-500">Loading…</div>
            <div v-else-if="queriesRows.length" class="overflow-x-auto rounded-xl border border-slate-700/50">
              <table class="min-w-full divide-y divide-slate-700/50 text-left text-sm">
                <thead class="bg-slate-800/80">
                  <tr>
                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Query</th>
                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Clicks</th>
                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Impressions</th>
                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">CTR</th>
                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <button type="button" class="inline-flex items-center gap-1 hover:text-white" @click="toggleQueriesPositionSort">
                        Position
                        <span class="text-xs text-slate-500">{{ queriesPositionSortDir === 'asc' ? '▲' : '▼' }}</span>
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-700/40">
                  <tr v-for="(row, i) in sortedQueriesRows" :key="i" class="hover:bg-slate-800/40">
                    <td class="max-w-[280px] truncate px-4 py-2.5 font-medium text-slate-200" :title="row.query">{{ row.query }}</td>
                    <td class="px-4 py-2.5 tabular-nums text-slate-400">{{ row.clicks.toLocaleString() }}</td>
                    <td class="px-4 py-2.5 tabular-nums text-slate-400">{{ row.impressions.toLocaleString() }}</td>
                    <td class="px-4 py-2.5 tabular-nums text-slate-400">{{ (row.ctr * 100).toFixed(2) }}%</td>
                    <td class="px-4 py-2.5 tabular-nums text-slate-400">{{ row.position.toFixed(1) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else-if="!queriesError" class="py-6 text-center text-sm text-slate-500">No query data for this period.</p>
          </section>

          <section class="mb-8 rounded-2xl border border-slate-700/70 bg-slate-900/40 p-6 shadow-xl shadow-black/15 ring-1 ring-white/[0.04]">
            <h3 class="mb-2 text-lg font-semibold text-white">Top pages</h3>
            <p class="mb-4 text-sm text-slate-400">URLs that appeared most in search results for the selected period.</p>
            <p v-if="pagesError" class="mb-4 text-sm text-rose-400">{{ pagesError }}</p>
            <div v-if="pagesLoading" class="py-8 text-center text-sm text-slate-500">Loading…</div>
            <div v-else-if="pagesRows.length" class="overflow-x-auto rounded-xl border border-slate-700/50">
              <table class="min-w-full divide-y divide-slate-700/50 text-left text-sm">
                <thead class="bg-slate-800/80">
                  <tr>
                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Page</th>
                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Clicks</th>
                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Impressions</th>
                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">CTR</th>
                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <button type="button" class="inline-flex items-center gap-1 hover:text-white" @click="togglePagesPositionSort">
                        Position
                        <span class="text-xs text-slate-500">{{ pagesPositionSortDir === 'asc' ? '▲' : '▼' }}</span>
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-700/40">
                  <tr v-for="(row, i) in sortedPagesRows" :key="i" class="hover:bg-slate-800/40">
                    <td class="max-w-[320px] truncate px-4 py-2.5 font-medium text-slate-200" :title="row.page">{{ row.page }}</td>
                    <td class="px-4 py-2.5 tabular-nums text-slate-400">{{ row.clicks.toLocaleString() }}</td>
                    <td class="px-4 py-2.5 tabular-nums text-slate-400">{{ row.impressions.toLocaleString() }}</td>
                    <td class="px-4 py-2.5 tabular-nums text-slate-400">{{ (row.ctr * 100).toFixed(2) }}%</td>
                    <td class="px-4 py-2.5 tabular-nums text-slate-400">{{ row.position.toFixed(1) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else-if="!pagesError" class="py-6 text-center text-sm text-slate-500">No page data for this period.</p>
          </section>
        </template>
      </template>

      <div v-else class="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-12 text-center shadow-xl">
        <p class="text-slate-400">Site not found.</p>
        <NuxtLink to="/dashboard" class="mt-4 inline-block font-semibold text-[#3b82f6] hover:underline">Back to Dashboard</NuxtLink>
      </div>
  </SiteIntegrationShell>
</template>


<script setup lang="ts">
import type { SiteRecord } from '~/types'
import type { GoogleStatusResponse } from '~/composables/useGoogleIntegration'
import { getSite } from '~/services/sites'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'
import { getApiErrorMessage } from '~/utils/apiError'
import { withDarkChartOption } from '~/utils/echartsDarkTheme'

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
const queriesPositionSortDir = ref<'asc' | 'desc'>('asc')
const sortedQueriesRows = computed(() => {
  return [...queriesRows.value].sort((a, b) => {
    return queriesPositionSortDir.value === 'asc'
      ? a.position - b.position
      : b.position - a.position
  })
})

const pagesLoading = ref(false)
const pagesError = ref('')
const pagesRows = ref<Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>>([])
const pagesPositionSortDir = ref<'asc' | 'desc'>('asc')

const sortedPagesRows = computed(() => {
  return [...pagesRows.value].sort((a, b) => {
    return pagesPositionSortDir.value === 'asc' ? a.position - b.position : b.position - a.position
  })
})

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
    clicksChart.setOption(
      withDarkChartOption({
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
        xAxis: { type: 'category', data: dates, boundaryGap: false },
        yAxis: { type: 'value', name: 'Clicks', minInterval: 1 },
        series: [
          {
            name: 'Clicks',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { width: 2, color: '#3b82f6' },
            itemStyle: { color: '#3b82f6' },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(59, 130, 246, 0.35)' },
                  { offset: 1, color: 'rgba(59, 130, 246, 0)' },
                ],
              },
            },
            data: clicks,
          },
        ],
      }),
    )
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

function toggleQueriesPositionSort() {
  queriesPositionSortDir.value = queriesPositionSortDir.value === 'asc' ? 'desc' : 'asc'
}

function togglePagesPositionSort() {
  pagesPositionSortDir.value = pagesPositionSortDir.value === 'asc' ? 'desc' : 'asc'
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
