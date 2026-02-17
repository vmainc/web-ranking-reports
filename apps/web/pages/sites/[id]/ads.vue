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
            Select which Google Ads customer (account) to use for reports. An admin must configure the Google Ads developer token in Admin → Integrations first.
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
                {{ customersLoading ? 'Loading accounts…' : customers.length ? '— Select account —' : 'Load accounts' }}
              </option>
              <option v-for="c in customers" :key="c.customerId" :value="c.customerId">
                {{ c.customerId }} {{ c.name !== c.customerId ? `(${c.name})` : '' }}
              </option>
            </select>
            <button
              v-if="!customers.length && !customersLoading"
              type="button"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
              :disabled="!googleStatus.providers?.google_ads?.hasScope"
              @click="loadCustomers"
            >
              Load accounts
            </button>
            <button
              v-else-if="selectedCustomerId"
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

          <template v-if="summary">
            <div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
                <p class="text-xs font-medium uppercase tracking-wide text-surface-400">Impressions</p>
                <p class="mt-1 text-2xl font-semibold text-surface-900">
                  {{ summary.summary.impressions.toLocaleString() }}
                </p>
              </div>
              <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
                <p class="text-xs font-medium uppercase tracking-wide text-surface-400">Clicks</p>
                <p class="mt-1 text-2xl font-semibold text-surface-900">
                  {{ summary.summary.clicks.toLocaleString() }}
                </p>
              </div>
              <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
                <p class="text-xs font-medium uppercase tracking-wide text-surface-400">Cost</p>
                <p class="mt-1 text-2xl font-semibold text-surface-900">
                  ${{ summary.summary.cost.toFixed(2) }}
                </p>
              </div>
              <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
                <p class="text-xs font-medium uppercase tracking-wide text-surface-400">CTR</p>
                <p class="mt-1 text-2xl font-semibold text-surface-900">
                  {{ summary.summary.impressions ? ((summary.summary.clicks / summary.summary.impressions) * 100).toFixed(2) : '0' }}%
                </p>
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
                      <th class="px-4 py-2 text-right text-xs font-medium uppercase text-surface-500">Impressions</th>
                      <th class="px-4 py-2 text-right text-xs font-medium uppercase text-surface-500">Clicks</th>
                      <th class="px-4 py-2 text-right text-xs font-medium uppercase text-surface-500">Cost</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-200 bg-white">
                    <tr v-for="row in summary.rows" :key="row.campaignName" class="text-sm">
                      <td class="px-4 py-3 font-medium text-surface-900">{{ row.campaignName || '—' }}</td>
                      <td class="px-4 py-3 text-right text-surface-700">{{ row.impressions.toLocaleString() }}</td>
                      <td class="px-4 py-3 text-right text-surface-700">{{ row.clicks.toLocaleString() }}</td>
                      <td class="px-4 py-3 text-right text-surface-700">${{ row.cost.toFixed(2) }}</td>
                    </tr>
                    <tr v-if="summary.rows.length === 0">
                      <td colspan="4" class="px-4 py-8 text-center text-surface-500">No campaign data for this period.</td>
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
} = useGoogleIntegration()

const site = ref<SiteRecord | null>(null)
const pending = ref(true)
const googleStatus = ref<GoogleStatusResponse | null>(null)
const customers = ref<Array<{ resourceName: string; customerId: string; name: string }>>([])
const customersLoading = ref(false)
const customersError = ref('')
const selectedCustomerId = ref('')
const customerSaving = ref(false)
const changingAccount = ref(false)
const summary = ref<{
  customerId: string
  startDate: string
  endDate: string
  summary: { impressions: number; clicks: number; costMicros: number; cost: number }
  rows: Array<{ campaignName: string; impressions: number; clicks: number; costMicros: number; cost: number }>
} | null>(null)
const summaryLoading = ref(false)
const summaryError = ref('')

const endD = new Date()
const startD = new Date()
startD.setDate(startD.getDate() - 30)
const startDate = ref(startD.toISOString().slice(0, 10))
const endDate = ref(endD.toISOString().slice(0, 10))

async function loadStatus() {
  const id = siteId.value
  if (!id) return
  googleStatus.value = await getStatus(id)
}

async function loadCustomers() {
  customersError.value = ''
  customersLoading.value = true
  try {
    const res = await getAdsCustomers(siteId.value)
    customers.value = res.customers
    if (res.customers.length === 1) selectedCustomerId.value = res.customers[0].customerId
  } catch (e) {
    customersError.value = e instanceof Error ? e.message : 'Failed to load Google Ads accounts.'
  } finally {
    customersLoading.value = false
  }
}

async function saveCustomer() {
  if (!selectedCustomerId.value) return
  customerSaving.value = true
  try {
    const c = customers.value.find((x) => x.customerId === selectedCustomerId.value)
    await selectAdsCustomer(siteId.value, selectedCustomerId.value, c?.name)
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
    customers.value = []
    summary.value = null
    await loadStatus()
  } finally {
    changingAccount.value = false
  }
}

async function loadSummary() {
  summaryError.value = ''
  summaryLoading.value = true
  try {
    summary.value = await getAdsSummary(siteId.value, startDate.value, endDate.value)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string; response?: { _data?: { message?: string } } }
    const fromResponse = err?.data?.message ?? err?.response?._data?.message
    summaryError.value = fromResponse || (e instanceof Error ? e.message : String(e)) || 'Failed to load Google Ads data.'
  } finally {
    summaryLoading.value = false
  }
}

async function init() {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
    await loadStatus()
    if (googleStatus.value?.selectedAdsCustomer && !summary.value) {
      await loadSummary()
    }
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>
