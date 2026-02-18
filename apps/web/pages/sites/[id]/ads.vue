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
        <h1 class="text-2xl font-semibold text-surface-900">Google Ads</h1>
        <p class="mt-1 text-sm text-surface-500">View campaign performance: impressions, clicks, and spend for this site.</p>
      </div>

      <!-- Not connected -->
      <div
        v-if="googleStatus && !googleStatus.connected"
        class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800"
      >
        <p class="font-medium">Google Ads is not connected for this site.</p>
        <p class="mt-1 text-sm">Connect Google from the Integrations section on the site page (Google Ads uses the same Google account).</p>
        <NuxtLink :to="`/sites/${site.id}`" class="mt-4 inline-block text-sm font-medium underline">
          Go to {{ site.name }} →
        </NuxtLink>
      </div>

      <!-- Connected but no Ads scope or no customer selected -->
      <template v-else-if="googleStatus?.connected">
        <!-- Customer picker when none selected -->
        <section v-if="!googleStatus.selectedAdsCustomer" class="mb-10">
          <h2 class="mb-2 text-lg font-medium text-surface-900">Choose your Google Ads account</h2>
          <p class="mb-4 text-sm text-surface-500">
            Select which Google Ads customer (account) to use for reports. If your account is under a Manager (MCC), also select the manager account in the second dropdown. An admin must configure the Google Ads developer token in Admin → Integrations first.
          </p>
          <div v-if="!googleStatus.providers?.google_ads?.hasScope" class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p class="font-medium">Google Ads scope not granted.</p>
            <p class="mt-1">Disconnect Google on the site Integrations page, then connect again and make sure to approve access to Google Ads when prompted.</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <select
              v-model="selectedCustomerId"
              class="min-w-[220px] rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              :disabled="customersLoading"
            >
              <option value="">
                {{ customersLoading ? 'Loading accounts…' : customers.length ? '— Select account —' : 'No accounts found' }}
              </option>
              <option v-for="c in customers" :key="c.customerId" :value="c.customerId">
                {{ c.customerId }} {{ c.name !== c.customerId ? `(${c.name})` : '' }}
              </option>
            </select>
            <select
              v-model="selectedLoginCustomerId"
              class="min-w-[220px] rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              :disabled="customersLoading || !customers.length"
              title="Required if your account is under a Manager (MCC)"
            >
              <option value="">Manager (MCC): — None —</option>
              <option v-for="c in customers" :key="'mcc-' + c.customerId" :value="c.customerId">
                {{ c.customerId }} {{ c.name !== c.customerId ? `(${c.name})` : '' }}
              </option>
            </select>
            <button
              v-if="selectedCustomerId"
              type="button"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
              :disabled="customerSaving"
              @click="saveCustomer"
            >
              {{ customerSaving ? 'Saving…' : 'Use this account' }}
            </button>
          </div>
          <p v-if="customersError" class="mt-4 text-sm text-red-600">{{ customersError }}</p>
        </section>

        <!-- Summary + campaigns (customer selected) -->
        <template v-else>
          <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-medium text-surface-900">Campaign performance</h2>
              <p class="mt-0.5 text-sm text-surface-500">
                Account: {{ googleStatus.selectedAdsCustomer?.name }}
              </p>
              <p v-if="googleStatus.selectedAdsLoginCustomerId" class="mt-0.5 text-sm text-surface-500">
                Manager (MCC): {{ googleStatus.selectedAdsLoginCustomerId }}
              </p>
              <p class="mt-1 text-sm text-surface-500">
                <button
                  type="button"
                  class="text-primary-600 hover:underline"
                  :disabled="changingAccount"
                  @click="handleChangeAccount"
                >
                  Change account
                </button>
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

          <div v-if="summary?.usedFallbackDateRange" class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Custom date range could not be used; showing last 30 days instead.
          </div>
          <template v-if="summary">
            <!-- Six metrics in a 3×2 grid, all matching box style -->
            <div class="mb-8 grid gap-4 sm:grid-cols-3">
              <div class="rounded-xl border-2 border-primary-200 bg-primary-50/50 p-5 shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-primary-700">Cost</p>
                <p class="mt-1 text-3xl font-bold text-primary-900">
                  ${{ summary.summary.cost.toFixed(2) }}
                </p>
              </div>
              <div class="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Conversions</p>
                <p class="mt-1 text-3xl font-bold text-emerald-900">
                  {{ summary.summary.conversions.toLocaleString(undefined, { maximumFractionDigits: 1 }) }}
                </p>
              </div>
              <div class="rounded-xl border-2 border-sky-200 bg-sky-50/50 p-5 shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-sky-700">Clicks</p>
                <p class="mt-1 text-3xl font-bold text-sky-900">
                  {{ summary.summary.clicks.toLocaleString() }}
                </p>
              </div>
              <div class="rounded-xl border-2 border-violet-200 bg-violet-50/50 p-5 shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-violet-700">Conv. rate</p>
                <p class="mt-1 text-3xl font-bold text-violet-900">
                  {{ summary.summary.clicks ? ((summary.summary.conversions / summary.summary.clicks) * 100).toFixed(1) : '0' }}%
                </p>
              </div>
              <div class="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-amber-700">Impressions</p>
                <p class="mt-1 text-3xl font-bold text-amber-900">
                  {{ summary.summary.impressions.toLocaleString() }}
                </p>
              </div>
              <div class="rounded-xl border-2 border-slate-200 bg-slate-50/50 p-5 shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-700">CTR</p>
                <p class="mt-1 text-3xl font-bold text-slate-900">
                  {{ summary.summary.impressions ? ((summary.summary.clicks / summary.summary.impressions) * 100).toFixed(2) : '0' }}%
                </p>
              </div>
            </div>

            <!-- Trend: Cost, Conversions, Clicks over time -->
            <div class="mb-8 rounded-xl border border-surface-200 bg-white shadow-sm overflow-hidden">
              <h3 class="border-b border-surface-200 bg-surface-50 px-4 py-3 text-sm font-semibold text-surface-900">
                Trend ({{ summary.startDate }} – {{ summary.endDate }})
              </h3>
              <div v-if="timeseriesLoading" class="h-64 flex items-center justify-center text-sm text-surface-500">Loading trend…</div>
              <div v-else-if="timeseriesError" class="px-4 py-6 text-sm text-amber-700">{{ timeseriesError }}</div>
              <div v-else-if="timeseriesRows.length === 0" class="flex h-64 items-center justify-center text-sm text-surface-500">No daily data for this period.</div>
              <div v-else class="p-4">
                <div ref="trendChartEl" class="h-72 w-full min-h-[18rem]" />
              </div>
            </div>

            <div class="rounded-xl border border-surface-200 bg-white shadow-sm overflow-hidden">
              <h3 class="border-b border-surface-200 bg-surface-50 px-4 py-3 text-sm font-semibold text-surface-900">
                By campaign ({{ summary.startDate }} – {{ summary.endDate }})
              </h3>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-surface-200">
                  <thead class="bg-surface-50">
                    <tr>
                      <th class="px-4 py-2 text-left text-xs font-medium uppercase text-surface-500">Campaign</th>
                      <th class="px-4 py-2 text-right text-xs font-medium uppercase text-surface-500">Cost</th>
                      <th class="px-4 py-2 text-right text-xs font-medium uppercase text-surface-500">Conversions</th>
                      <th class="px-4 py-2 text-right text-xs font-medium uppercase text-surface-500">Clicks</th>
                      <th class="px-4 py-2 text-right text-xs font-medium uppercase text-surface-500">Impressions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-200 bg-white">
                    <tr v-for="row in summary.rows" :key="row.campaignName" class="text-sm">
                      <td class="px-4 py-3 font-medium text-surface-900">{{ row.campaignName || '—' }}</td>
                      <td class="px-4 py-3 text-right text-surface-700">${{ row.cost.toFixed(2) }}</td>
                      <td class="px-4 py-3 text-right text-surface-700">{{ row.conversions.toLocaleString(undefined, { maximumFractionDigits: 1 }) }}</td>
                      <td class="px-4 py-3 text-right text-surface-700">{{ row.clicks.toLocaleString() }}</td>
                      <td class="px-4 py-3 text-right text-surface-700">{{ row.impressions.toLocaleString() }}</td>
                    </tr>
                    <tr v-if="summary.rows.length === 0">
                      <td colspan="5" class="px-4 py-8 text-center text-surface-500">No campaign data for this period.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="mt-8 rounded-xl border border-surface-200 bg-white shadow-sm overflow-hidden">
              <h3 class="border-b border-surface-200 bg-surface-50 px-4 py-3 text-sm font-semibold text-surface-900">
                Demographics – gender ({{ summary.startDate }} – {{ summary.endDate }})
              </h3>
              <div v-if="demographicsLoading" class="px-4 py-8 text-center text-sm text-surface-500">Loading demographics…</div>
              <div v-else-if="demographicsError" class="px-4 py-6 text-sm text-amber-700">{{ demographicsError }}</div>
              <div v-else-if="demographicsRows.length === 0" class="flex h-48 items-center justify-center text-sm text-surface-500">No gender data for this period.</div>
              <div v-else class="p-4">
                <div ref="demographicsChartEl" class="h-64 w-full min-h-[16rem]" />
              </div>
            </div>

            <div class="mt-8 rounded-xl border border-surface-200 bg-white shadow-sm overflow-hidden">
              <h3 class="border-b border-surface-200 bg-surface-50 px-4 py-3 text-sm font-semibold text-surface-900">
                Keywords ({{ summary.startDate }} – {{ summary.endDate }})
              </h3>
              <div v-if="keywordsLoading" class="px-4 py-8 text-center text-sm text-surface-500">Loading keywords…</div>
              <div v-else-if="keywordsError" class="px-4 py-4 text-sm text-amber-700">{{ keywordsError }}</div>
              <div v-else class="overflow-x-auto">
                <table class="min-w-full divide-y divide-surface-200">
                  <thead class="bg-surface-50">
                    <tr>
                      <th class="px-4 py-2 text-left text-xs font-medium uppercase text-surface-500">Keyword</th>
                      <th class="px-4 py-2 text-left text-xs font-medium uppercase text-surface-500">Match type</th>
                      <th class="px-4 py-2 text-left text-xs font-medium uppercase text-surface-500">Campaign</th>
                      <th class="px-4 py-2 text-left text-xs font-medium uppercase text-surface-500">Ad group</th>
                      <th class="px-4 py-2 text-right text-xs font-medium uppercase text-surface-500">Impressions</th>
                      <th class="px-4 py-2 text-right text-xs font-medium uppercase text-surface-500">Clicks</th>
                      <th class="px-4 py-2 text-right text-xs font-medium uppercase text-surface-500">Cost</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-200 bg-white">
                    <tr v-for="(row, i) in keywordsRows" :key="i" class="text-sm">
                      <td class="px-4 py-3 font-medium text-surface-900">{{ row.keyword }}</td>
                      <td class="px-4 py-3 text-surface-700">{{ row.matchType }}</td>
                      <td class="px-4 py-3 text-surface-700">{{ row.campaignName }}</td>
                      <td class="px-4 py-3 text-surface-700">{{ row.adGroupName }}</td>
                      <td class="px-4 py-3 text-right text-surface-700">{{ row.impressions.toLocaleString() }}</td>
                      <td class="px-4 py-3 text-right text-surface-700">{{ row.clicks.toLocaleString() }}</td>
                      <td class="px-4 py-3 text-right text-surface-700">${{ row.cost.toFixed(2) }}</td>
                    </tr>
                    <tr v-if="keywordsRows.length === 0 && !keywordsLoading">
                      <td colspan="7" class="px-4 py-8 text-center text-surface-500">No keyword data for this period.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="mt-8 rounded-xl border border-surface-200 bg-white shadow-sm overflow-hidden">
              <h3 class="border-b border-surface-200 bg-surface-50 px-4 py-3 text-sm font-semibold text-surface-900">
                Ads that ran
              </h3>
              <div v-if="adsListLoading" class="px-4 py-8 text-center text-sm text-surface-500">Loading ads…</div>
              <div v-else-if="adsListError" class="px-4 py-4 text-sm text-amber-700">{{ adsListError }}</div>
              <div v-else class="overflow-x-auto">
                <table class="min-w-full divide-y divide-surface-200">
                  <thead class="bg-surface-50">
                    <tr>
                      <th class="px-4 py-2 text-left text-xs font-medium uppercase text-surface-500">Campaign</th>
                      <th class="px-4 py-2 text-left text-xs font-medium uppercase text-surface-500">Ad group</th>
                      <th class="px-4 py-2 text-left text-xs font-medium uppercase text-surface-500">Headline</th>
                      <th class="px-4 py-2 text-left text-xs font-medium uppercase text-surface-500">Description</th>
                      <th class="px-4 py-2 text-left text-xs font-medium uppercase text-surface-500">Status</th>
                      <th class="px-4 py-2 text-left text-xs font-medium uppercase text-surface-500">URL</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-200 bg-white">
                    <tr v-for="(row, i) in adsListRows" :key="i" class="text-sm">
                      <td class="px-4 py-3 font-medium text-surface-900">{{ row.campaignName }}</td>
                      <td class="px-4 py-3 text-surface-700">{{ row.adGroupName }}</td>
                      <td class="px-4 py-3 text-surface-700 max-w-xs truncate" :title="row.headline">{{ row.headline }}</td>
                      <td class="px-4 py-3 text-surface-700 max-w-xs truncate" :title="row.description">{{ row.description }}</td>
                      <td class="px-4 py-3 text-surface-700">{{ row.status }}</td>
                      <td class="px-4 py-3">
                        <a v-if="row.finalUrl" :href="row.finalUrl" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline max-w-[12rem] truncate inline-block" :title="row.finalUrl">{{ row.finalUrl }}</a>
                        <span v-else class="text-surface-400">—</span>
                      </td>
                    </tr>
                    <tr v-if="adsListRows.length === 0 && !adsListLoading">
                      <td colspan="6" class="px-4 py-8 text-center text-surface-500">No ads found.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
        </template>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import type { GoogleStatusResponse } from '~/composables/useGoogleIntegration'
import { getSite } from '~/services/sites'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()
const {
  getStatus,
  getAdsCustomers,
  selectAdsCustomer,
  clearAdsCustomer,
  getAdsSummary,
  getAdsKeywords,
  getAdsDemographics,
  getAdsList,
  getAdsSummaryTimeseries,
} = useGoogleIntegration()

const site = ref<SiteRecord | null>(null)
const pending = ref(true)
const googleStatus = ref<GoogleStatusResponse | null>(null)
const customers = ref<Array<{ resourceName: string; customerId: string; name: string; managerId?: string }>>([])
const customersLoading = ref(false)
const customersError = ref('')
const selectedCustomerId = ref('')
const selectedLoginCustomerId = ref('')
const customerSaving = ref(false)
const changingAccount = ref(false)
const summary = ref<{
  customerId: string
  startDate: string
  endDate: string
  usedFallbackDateRange?: boolean
  summary: { impressions: number; clicks: number; costMicros: number; cost: number; conversions: number }
  rows: Array<{ campaignName: string; impressions: number; clicks: number; costMicros: number; cost: number; conversions: number }>
} | null>(null)
const summaryLoading = ref(false)
const summaryError = ref('')
/** Prevents duplicate concurrent requests for the same params */
const summaryInFlightKey = ref<string | null>(null)

const keywordsRows = ref<Array<{
  keyword: string
  matchType: string
  campaignName: string
  adGroupName: string
  impressions: number
  clicks: number
  costMicros: number
  cost: number
}>>([])
const keywordsLoading = ref(false)
const keywordsError = ref('')

const demographicsRows = ref<Array<{ gender: string; clicks: number; impressions: number }>>([])
const demographicsLoading = ref(false)
const demographicsError = ref('')
const demographicsChartEl = ref<HTMLElement | null>(null)
let demographicsChart: import('echarts').ECharts | null = null

const adsListRows = ref<Array<{
  campaignName: string
  adGroupName: string
  status: string
  headline: string
  description: string
  finalUrl: string
}>>([])
const adsListLoading = ref(false)
const adsListError = ref('')

const timeseriesRows = ref<Array<{ date: string; clicks: number; cost: number; conversions: number }>>([])
const timeseriesLoading = ref(false)
const timeseriesError = ref('')
const trendChartEl = ref<HTMLElement | null>(null)
let trendChart: import('echarts').ECharts | null = null

const endD = new Date()
const startD = new Date()
startD.setDate(startD.getDate() - 30)
const startDate = ref(startD.toISOString().slice(0, 10))
const endDate = ref(endD.toISOString().slice(0, 10))

async function loadStatus() {
  const id = siteId.value
  if (!id) return
  googleStatus.value = await getStatus(id)
  if (!googleStatus.value?.selectedAdsCustomer && googleStatus.value?.selectedAdsLoginCustomerId) {
    selectedLoginCustomerId.value = googleStatus.value.selectedAdsLoginCustomerId
  }
}

async function loadCustomers() {
  customersError.value = ''
  customersLoading.value = true
  try {
    const res = await getAdsCustomers(siteId.value)
    customers.value = res.customers
    if (res.customers.length === 1) {
      selectedCustomerId.value = res.customers[0].customerId
      if (res.customers[0].managerId) selectedLoginCustomerId.value = res.customers[0].managerId
    }
  } catch (e) {
    customersError.value = e instanceof Error ? e.message : 'Failed to load Google Ads accounts.'
  } finally {
    customersLoading.value = false
  }
}

// When user selects an account that is under an MCC, auto-select the Manager dropdown
watch(selectedCustomerId, (id) => {
  if (!id) return
  const c = customers.value.find((x) => x.customerId === id)
  if (c?.managerId) selectedLoginCustomerId.value = c.managerId
})

async function saveCustomer() {
  if (!selectedCustomerId.value) return
  customerSaving.value = true
  try {
    const c = customers.value.find((x) => x.customerId === selectedCustomerId.value)
    await selectAdsCustomer(
      siteId.value,
      selectedCustomerId.value,
      c?.name,
      selectedLoginCustomerId.value || undefined
    )
    await loadStatus()
    await loadSummary()
  } catch (e) {
    customersError.value = e instanceof Error ? e.message : 'Failed to save.'
  } finally {
    customerSaving.value = false
  }
}

async function handleChangeAccount() {
  changingAccount.value = true
  try {
    await clearAdsCustomer(siteId.value)
    selectedCustomerId.value = ''
    selectedLoginCustomerId.value = ''
    summary.value = null
    await loadStatus()
    await loadCustomers()
  } finally {
    changingAccount.value = false
  }
}

async function loadSummary() {
  const key = `${siteId.value}:${startDate.value}:${endDate.value}`
  if (summaryInFlightKey.value === key) return
  summaryError.value = ''
  summaryLoading.value = true
  summaryInFlightKey.value = key
  try {
    summary.value = await getAdsSummary(siteId.value, startDate.value, endDate.value)
    loadKeywords()
    loadDemographics()
    loadAdsList()
    loadTimeseries()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string; response?: { _data?: { message?: string } } }
    const fromResponse = err?.data?.message ?? err?.response?._data?.message
    summaryError.value = fromResponse || (e instanceof Error ? e.message : String(e)) || 'Failed to load Google Ads data.'
  } finally {
    summaryLoading.value = false
    summaryInFlightKey.value = null
  }
}

async function loadKeywords() {
  if (!summary.value) return
  keywordsError.value = ''
  keywordsLoading.value = true
  try {
    const data = await getAdsKeywords(siteId.value, summary.value.startDate, summary.value.endDate)
    keywordsRows.value = data.rows ?? []
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    keywordsError.value = err?.data?.message ?? (e instanceof Error ? e.message : String(e)) ?? 'Failed to load keywords.'
    keywordsRows.value = []
  } finally {
    keywordsLoading.value = false
  }
}

async function loadTimeseries() {
  if (!summary.value) return
  timeseriesError.value = ''
  timeseriesLoading.value = true
  try {
    const data = await getAdsSummaryTimeseries(siteId.value, summary.value.startDate, summary.value.endDate)
    timeseriesRows.value = (data.rows ?? []).map((r) => ({ date: r.date, clicks: r.clicks, cost: r.cost, conversions: r.conversions }))
    await nextTick()
    renderTrendChart()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string; response?: { _data?: { message?: string } } }
    timeseriesError.value = err?.data?.message ?? err?.response?._data?.message ?? (e instanceof Error ? e.message : String(e)) ?? 'Failed to load trend.'
    timeseriesRows.value = []
  } finally {
    timeseriesLoading.value = false
  }
}

async function renderTrendChart() {
  const el = trendChartEl.value
  if (!el || timeseriesRows.value.length === 0) return
  const dates = timeseriesRows.value.map((r) => r.date)
  const clicks = timeseriesRows.value.map((r) => r.clicks)
  const conversions = timeseriesRows.value.map((r) => r.conversions)
  const cost = timeseriesRows.value.map((r) => r.cost)
  const echarts = await import('echarts')
  if (trendChart) trendChart.dispose()
  trendChart = echarts.init(el)
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['Cost', 'Clicks', 'Conversions'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: dates },
    yAxis: [
      { type: 'value', name: 'Clicks / Conversions', position: 'left' },
      { type: 'value', name: 'Cost ($)', position: 'right' },
    ],
    series: [
      { name: 'Cost', type: 'line', data: cost, yAxisIndex: 1, smooth: true, itemStyle: { color: '#0f766e' } },
      { name: 'Clicks', type: 'line', data: clicks, smooth: true, itemStyle: { color: '#0369a1' } },
      { name: 'Conversions', type: 'line', data: conversions, smooth: true, itemStyle: { color: '#047857' } },
    ],
  })
}

async function loadDemographics() {
  if (!summary.value) return
  demographicsError.value = ''
  demographicsLoading.value = true
  try {
    const data = await getAdsDemographics(siteId.value, summary.value.startDate, summary.value.endDate)
    demographicsRows.value = data.rows ?? []
    await nextTick()
    renderDemographicsChart()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string; response?: { _data?: { message?: string } } }
    demographicsError.value = err?.data?.message ?? err?.response?._data?.message ?? (e instanceof Error ? e.message : String(e)) ?? 'Failed to load demographics.'
    demographicsRows.value = []
  } finally {
    demographicsLoading.value = false
  }
}

async function renderDemographicsChart() {
  const el = demographicsChartEl.value
  if (!el || demographicsRows.value.length === 0) return
  const pieData = demographicsRows.value.map((r) => ({ value: r.clicks, name: r.gender })).filter((d) => d.value > 0)
  if (pieData.length === 0) return
  const echarts = await import('echarts')
  if (demographicsChart) demographicsChart.dispose()
  demographicsChart = echarts.init(el)
  demographicsChart.setOption({
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
}

async function loadAdsList() {
  adsListError.value = ''
  adsListLoading.value = true
  try {
    const data = await getAdsList(siteId.value)
    adsListRows.value = data.rows ?? []
    if ((data as { error?: string }).error && adsListRows.value.length === 0) {
      adsListError.value = (data as { error: string }).error
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    adsListError.value = err?.data?.message ?? (e instanceof Error ? e.message : String(e)) ?? 'Failed to load ads.'
    adsListRows.value = []
  } finally {
    adsListLoading.value = false
  }
}

async function init() {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
    await loadStatus()
    if (googleStatus.value?.selectedAdsCustomer && !summary.value) {
      await loadSummary()
    } else if (
      googleStatus.value?.connected &&
      !googleStatus.value?.selectedAdsCustomer &&
      googleStatus.value?.providers?.google_ads?.hasScope
    ) {
      await loadCustomers()
    }
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())

onUnmounted(() => {
  if (demographicsChart) {
    demographicsChart.dispose()
    demographicsChart = null
  }
  if (trendChart) {
    trendChart.dispose()
    trendChart = null
  }
})
</script>
