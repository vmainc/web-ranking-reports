<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
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
        <h1 class="text-2xl font-semibold text-surface-900">Google Local Service Ads</h1>
        <p class="mt-1 text-sm text-surface-500">Choose an LSA account and review core KPIs for this site.</p>
      </div>

      <div
        v-if="googleStatus && !googleStatus.connected"
        class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800"
      >
        <p class="font-medium">Google is not connected for this site.</p>
        <p class="mt-1 text-sm">Connect Google from Integrations first. Local Service Ads uses that same Google account connection.</p>
        <NuxtLink :to="`/sites/${site.id}`" class="mt-4 inline-block text-sm font-medium underline">
          Go to {{ site.name }} →
        </NuxtLink>
      </div>

      <template v-else-if="googleStatus?.connected">
        <section v-if="!googleStatus.selectedLocalServicesCustomer" class="mb-10">
          <h2 class="mb-2 text-lg font-medium text-surface-900">Choose your Local Service Ads account</h2>
          <p class="mb-4 text-sm text-surface-500">
            Select which Google Ads customer to use for Local Service Ads reporting. If this customer is under a Manager (MCC), also select the manager in the second dropdown.
          </p>
          <div v-if="!googleStatus.providers?.google_local_services_ads?.hasScope" class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p class="font-medium">Google Ads scope not granted.</p>
            <p class="mt-1">Disconnect Google, then reconnect and approve Google Ads access.</p>
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

        <template v-else>
          <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-medium text-surface-900">Local Service Ads summary</h2>
              <p class="mt-0.5 text-sm text-surface-500">Account: {{ googleStatus.selectedLocalServicesCustomer?.name }}</p>
              <p v-if="googleStatus.selectedLocalServicesLoginCustomerId" class="mt-0.5 text-sm text-surface-500">
                Manager (MCC): {{ googleStatus.selectedLocalServicesLoginCustomerId }}
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
              <div class="rounded-xl border-2 border-primary-200 bg-primary-50/50 p-5 shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-primary-700">Cost</p>
                <p class="mt-1 text-3xl font-bold text-primary-900">${{ summary.summary.cost.toFixed(2) }}</p>
              </div>
              <div class="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Leads</p>
                <p class="mt-1 text-3xl font-bold text-emerald-900">{{ summary.summary.leads.toLocaleString(undefined, { maximumFractionDigits: 1 }) }}</p>
              </div>
              <div class="rounded-xl border-2 border-sky-200 bg-sky-50/50 p-5 shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-sky-700">Clicks</p>
                <p class="mt-1 text-3xl font-bold text-sky-900">{{ summary.summary.clicks.toLocaleString() }}</p>
              </div>
              <div class="rounded-xl border-2 border-violet-200 bg-violet-50/50 p-5 shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-violet-700">Cost / Lead</p>
                <p class="mt-1 text-3xl font-bold text-violet-900">
                  ${{ summary.summary.leads > 0 ? (summary.summary.cost / summary.summary.leads).toFixed(2) : '0.00' }}
                </p>
              </div>
              <div class="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-amber-700">Impressions</p>
                <p class="mt-1 text-3xl font-bold text-amber-900">{{ summary.summary.impressions.toLocaleString() }}</p>
              </div>
              <div class="rounded-xl border-2 border-slate-200 bg-slate-50/50 p-5 shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-700">CTR</p>
                <p class="mt-1 text-3xl font-bold text-slate-900">
                  {{ summary.summary.impressions ? ((summary.summary.clicks / summary.summary.impressions) * 100).toFixed(2) : '0.00' }}%
                </p>
              </div>
              <div class="rounded-xl border-2 border-fuchsia-200 bg-fuchsia-50/50 p-5 shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-fuchsia-700">Lead rate</p>
                <p class="mt-1 text-3xl font-bold text-fuchsia-900">
                  {{ summary.summary.clicks ? ((summary.summary.leads / summary.summary.clicks) * 100).toFixed(2) : '0.00' }}%
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
                      <th class="px-4 py-2 text-right text-xs font-medium uppercase text-surface-500">Cost</th>
                      <th class="px-4 py-2 text-right text-xs font-medium uppercase text-surface-500">Leads</th>
                      <th class="px-4 py-2 text-right text-xs font-medium uppercase text-surface-500">Clicks</th>
                      <th class="px-4 py-2 text-right text-xs font-medium uppercase text-surface-500">Impressions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-200 bg-white">
                    <tr v-for="row in summary.rows" :key="row.campaignName" class="text-sm">
                      <td class="px-4 py-3 font-medium text-surface-900">{{ row.campaignName || '—' }}</td>
                      <td class="px-4 py-3 text-right text-surface-700">${{ row.cost.toFixed(2) }}</td>
                      <td class="px-4 py-3 text-right text-surface-700">{{ row.leads.toLocaleString(undefined, { maximumFractionDigits: 1 }) }}</td>
                      <td class="px-4 py-3 text-right text-surface-700">{{ row.clicks.toLocaleString() }}</td>
                      <td class="px-4 py-3 text-right text-surface-700">{{ row.impressions.toLocaleString() }}</td>
                    </tr>
                    <tr v-if="summary.rows.length === 0">
                      <td colspan="5" class="px-4 py-8 text-center text-surface-500">No Local Service Ads campaign data for this period.</td>
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
import type { GoogleStatusResponse } from '~/composables/useGoogleIntegration'
import type { SiteRecord } from '~/types'
import { getSite } from '~/services/sites'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => String(route.params.id ?? ''))
const pb = usePocketbase()
const { getStatus, getLocalServicesAccounts, selectLocalServicesAccount, clearLocalServicesAccount, getLocalServicesSummary } = useGoogleIntegration()

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
  summary: { impressions: number; clicks: number; costMicros: number; cost: number; leads: number }
  rows: Array<{ campaignName: string; impressions: number; clicks: number; costMicros: number; cost: number; leads: number }>
} | null>(null)
const summaryLoading = ref(false)
const summaryError = ref('')

const endD = new Date()
const startD = new Date()
startD.setDate(startD.getDate() - 30)
const startDate = ref(startD.toISOString().slice(0, 10))
const endDate = ref(endD.toISOString().slice(0, 10))

watch(selectedCustomerId, (id) => {
  if (!id) return
  const c = customers.value.find((x) => x.customerId === id)
  if (c?.managerId) selectedLoginCustomerId.value = c.managerId
})

async function loadStatus() {
  googleStatus.value = await getStatus(siteId.value)
  if (!googleStatus.value?.selectedLocalServicesCustomer && googleStatus.value?.selectedLocalServicesLoginCustomerId) {
    selectedLoginCustomerId.value = googleStatus.value.selectedLocalServicesLoginCustomerId
  }
}

async function loadCustomers() {
  customersError.value = ''
  customersLoading.value = true
  try {
    const res = await getLocalServicesAccounts(siteId.value)
    customers.value = res.customers
  } catch (e) {
    customersError.value = e instanceof Error ? e.message : 'Failed to load Local Service Ads accounts.'
  } finally {
    customersLoading.value = false
  }
}

async function saveCustomer() {
  if (!selectedCustomerId.value) return
  customerSaving.value = true
  try {
    const c = customers.value.find((x) => x.customerId === selectedCustomerId.value)
    await selectLocalServicesAccount(siteId.value, selectedCustomerId.value, c?.name, selectedLoginCustomerId.value || undefined)
    await loadStatus()
    await loadSummary()
  } catch (e) {
    customersError.value = e instanceof Error ? e.message : 'Failed to save account.'
  } finally {
    customerSaving.value = false
  }
}

async function handleChangeAccount() {
  changingAccount.value = true
  try {
    await clearLocalServicesAccount(siteId.value)
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
  summaryError.value = ''
  summaryLoading.value = true
  try {
    summary.value = await getLocalServicesSummary(siteId.value, startDate.value, endDate.value)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string; response?: { _data?: { message?: string } } }
    summaryError.value = err?.data?.message ?? err?.response?._data?.message ?? (e instanceof Error ? e.message : 'Failed to load Local Service Ads summary.')
    summary.value = null
  } finally {
    summaryLoading.value = false
  }
}

async function init() {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
    await loadStatus()
    if (googleStatus.value?.selectedLocalServicesCustomer) {
      await loadSummary()
    } else if (googleStatus.value?.connected && googleStatus.value?.providers?.google_local_services_ads?.hasScope) {
      await loadCustomers()
    }
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>
