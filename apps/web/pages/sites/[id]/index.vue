<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div v-if="pending" class="flex justify-center py-12">
      <p class="text-surface-500">Loading…</p>
    </div>

    <template v-else-if="site">
      <div class="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <NuxtLink
            to="/dashboard"
            class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
          >
            ← Dashboard
          </NuxtLink>
          <h1 class="text-2xl font-semibold text-surface-900">{{ site.name }}</h1>
          <p class="mt-1 text-sm text-surface-500">{{ site.domain }}</p>
        </div>
        <NuxtLink
          :to="`/sites/${site.id}/settings`"
          class="rounded p-2 text-surface-400 hover:bg-surface-100 hover:text-surface-600"
          title="Site settings"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </NuxtLink>
      </div>

      <!-- Performance summary (Google Analytics) – only when connected -->
      <section
        v-if="hasGa"
        class="mb-10 rounded-2xl border border-surface-200 bg-white p-6 shadow-sm"
      >
        <h2 class="mb-4 text-lg font-semibold text-surface-900">Performance summary</h2>
        <DashboardWidgetKpiSummary
          :site-id="site.id"
          range="last_28_days"
          compare="previous_period"
          :subtitle="''"
          report-mode
          :show-menu="false"
        />
      </section>

      <!-- Google Ads summary – only when connected -->
      <section
        v-if="hasAds"
        class="mb-10 rounded-2xl border border-surface-200 bg-white p-6 shadow-sm"
      >
        <h2 class="mb-4 text-lg font-semibold text-surface-900">Google Ads</h2>
        <GoogleAdsSummaryWidget :site-id="site.id" />
      </section>

      <!-- WooCommerce sales summary (when WooCommerce is configured) -->
      <section
        v-if="wooConfigLoaded && wooConfigured"
        class="mb-10 rounded-2xl border border-surface-200 bg-white p-6 shadow-sm"
      >
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-surface-900">WooCommerce</h2>
          <NuxtLink
            :to="`/sites/${site.id}/woocommerce`"
            class="text-sm font-medium text-primary-600 hover:underline"
          >
            View full report →
          </NuxtLink>
        </div>
        <p v-if="wooReportError" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {{ wooReportError }}
        </p>
        <div v-else-if="wooReportLoading && !wooReport" class="py-6 text-center text-sm text-surface-500">
          Loading sales report…
        </div>
        <div v-else-if="wooReport" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-xl border border-surface-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
            <p class="text-sm font-medium text-surface-500">Total revenue</p>
            <p class="mt-1 text-2xl font-semibold text-surface-900">
              {{ formatWooCurrency(wooReport.totalRevenue) }}
            </p>
            <p class="mt-0.5 text-xs text-surface-500">{{ wooReport.startDate }} – {{ wooReport.endDate }}</p>
          </div>
          <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-medium text-surface-500">Orders</p>
            <p class="mt-1 text-2xl font-semibold text-surface-900">
              {{ wooReport.totalOrders.toLocaleString() }}
            </p>
            <p class="mt-0.5 text-xs text-surface-500">Completed & processing</p>
          </div>
          <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-medium text-surface-500">Avg order value</p>
            <p class="mt-1 text-2xl font-semibold text-surface-900">
              {{ formatWooCurrency(wooReport.totalOrders ? wooReport.totalRevenue / wooReport.totalOrders : 0) }}
            </p>
          </div>
          <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-medium text-surface-500">Days with sales</p>
            <p class="mt-1 text-2xl font-semibold text-surface-900">
              {{ wooReport.revenueByDay?.length ?? 0 }}
            </p>
          </div>
        </div>
      </section>

      <section class="mb-10">
        <div
          v-if="googleConnectedToast"
          class="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800"
        >
          Google connected successfully. Use <strong>View</strong> on Google Analytics to choose a property and see reports.
        </div>
        <h2 class="mb-4 text-lg font-medium text-surface-900">Integrations</h2>
        <p class="mb-6 text-sm text-surface-500">
          Connect data sources for this site. When connected, click <strong>View</strong> to open the analytics dashboard and reports.
        </p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SiteIntegrationCard
            v-for="provider in providerList"
            :key="provider"
            :site-id="site.id"
            :provider="provider"
            :integration="integrationByProvider(provider)"
            :google-status="googleStatus"
            :other-connected-site="otherConnectedSite"
            @updated="refreshIntegrations"
          />
          <div
            class="flex flex-col rounded-xl border border-surface-200 bg-white p-5 shadow-card transition hover:shadow-card-hover"
          >
            <div class="flex min-w-0 flex-1 items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-500">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div class="min-w-0">
                <h3 class="font-medium text-surface-900">Site audit</h3>
                <p class="mt-0.5 text-sm text-surface-500">Technical and SEO health checks</p>
              </div>
            </div>
            <div class="mt-4">
              <NuxtLink
                :to="`/sites/${site.id}/site-audit`"
                class="flex items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
              >
                View
              </NuxtLink>
            </div>
          </div>
          <div
            class="flex flex-col rounded-xl border border-surface-200 bg-white p-5 shadow-card transition hover:shadow-card-hover"
          >
            <div class="flex min-w-0 flex-1 items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-500">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div class="min-w-0">
                <h3 class="font-medium text-surface-900">Rank tracking</h3>
                <p class="mt-0.5 text-sm text-surface-500">Track keyword rankings (DataForSEO)</p>
              </div>
            </div>
            <div class="mt-4">
              <NuxtLink
                :to="`/sites/${site.id}/rank-tracking`"
                class="flex items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
              >
                View
              </NuxtLink>
            </div>
          </div>
          <div
            class="flex flex-col rounded-xl border border-surface-200 bg-white p-5 shadow-card transition hover:shadow-card-hover"
          >
            <div class="flex min-w-0 flex-1 items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-500">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div class="min-w-0">
                <h3 class="font-medium text-surface-900">Lead Generation</h3>
                <p class="mt-0.5 text-sm text-surface-500">Embeddable forms + instant audits</p>
              </div>
            </div>
            <div class="mt-4 flex flex-col gap-2">
              <NuxtLink
                :to="`/sites/${site.id}/lead-generation/forms`"
                class="flex items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
              >
                Open
              </NuxtLink>
              <NuxtLink
                :to="`/sites/${site.id}/lead-generation/forms/new`"
                class="flex items-center justify-center rounded-lg border border-surface-200 px-3 py-2 text-sm font-medium text-surface-600 hover:bg-surface-50"
              >
                Create Form
              </NuxtLink>
            </div>
          </div>
        </div>
      </section>
    </template>

    <div v-else class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-500">Site not found.</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-primary-600 hover:underline">Back to Dashboard</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord, IntegrationRecord, IntegrationProvider } from '~/types'
import type { GoogleStatusResponse } from '~/composables/useGoogleIntegration'
import { getSite } from '~/services/sites'
import { listIntegrationsBySite, getProviderList } from '~/services/integrations'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'

const route = useRoute()
const siteId = computed(() => route.params.id as string)

const pb = usePocketbase()
const { getStatus, getOtherConnectedSite } = useGoogleIntegration()
const site = ref<SiteRecord | null>(null)
const integrations = ref<IntegrationRecord[]>([])
const googleStatus = ref<GoogleStatusResponse | null>(null)
const googleConnectedToast = ref(false)
const otherConnectedSite = ref<{ otherSiteId: string; otherSiteName: string | null } | null>(null)
const pending = ref(true)

const hasGa = computed(() => !!googleStatus.value?.connected && !!googleStatus.value?.selectedProperty)
const hasAds = computed(() => !!googleStatus.value?.connected && !!googleStatus.value?.selectedAdsCustomer)
const providerList = getProviderList()

// WooCommerce sales summary (when integration is configured)
const wooConfigLoaded = ref(false)
const wooConfigured = ref(false)
const wooReport = ref<{
  startDate: string
  endDate: string
  totalRevenue: number
  totalOrders: number
  revenueByDay: Array<{ date: string; value: number }>
} | null>(null)
const wooReportLoading = ref(false)
const wooReportError = ref('')

function formatWooCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value)
}

async function loadWooConfig() {
  if (!site.value || !integrationByProvider('woocommerce')) {
    wooConfigLoaded.value = true
    wooConfigured.value = false
    return
  }
  wooConfigLoaded.value = false
  try {
    const data = await $fetch<{ configured: boolean }>('/api/woocommerce/config', {
      query: { siteId: site.value.id },
      headers: authHeaders(),
    })
    wooConfigured.value = data.configured
  } catch {
    wooConfigured.value = false
  } finally {
    wooConfigLoaded.value = true
  }
}

async function loadWooReport() {
  if (!site.value || !wooConfigured.value) return
  wooReportError.value = ''
  wooReportLoading.value = true
  const endD = new Date()
  const startD = new Date()
  startD.setDate(startD.getDate() - 30)
  const startDate = startD.toISOString().slice(0, 10)
  const endDate = endD.toISOString().slice(0, 10)
  try {
    const data = await $fetch<typeof wooReport.value>('/api/woocommerce/report', {
      query: { siteId: site.value.id, startDate, endDate },
      headers: authHeaders(),
    })
    wooReport.value = data
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    wooReportError.value = err?.data?.message ?? err?.message ?? 'Failed to load sales report.'
  } finally {
    wooReportLoading.value = false
  }
}

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function integrationByProvider(provider: IntegrationProvider): IntegrationRecord | undefined {
  return integrations.value.find((i) => i.provider === provider)
}

async function loadSite() {
  const s = await getSite(pb, siteId.value)
  site.value = s
}

async function loadIntegrations() {
  if (!site.value) return
  integrations.value = await listIntegrationsBySite(pb, site.value.id)
}

async function loadGoogleStatus() {
  if (!site.value) return
  try {
    googleStatus.value = await getStatus(site.value.id)
  } catch {
    googleStatus.value = null
  }
}

async function loadOtherConnectedSite() {
  if (!site.value || googleStatus.value?.connected) {
    otherConnectedSite.value = null
    return
  }
  try {
    const res = await getOtherConnectedSite(site.value.id)
    if (res.otherSiteId) {
      otherConnectedSite.value = { otherSiteId: res.otherSiteId, otherSiteName: res.otherSiteName }
    } else {
      otherConnectedSite.value = null
    }
  } catch {
    otherConnectedSite.value = null
  }
}

async function refreshIntegrations() {
  await loadIntegrations()
  await loadGoogleStatus()
  await loadOtherConnectedSite()
  await loadWooConfig()
  if (wooConfigured.value) await loadWooReport()
}

async function init() {
  pending.value = true
  try {
    await loadSite()
    await Promise.all([loadIntegrations(), loadGoogleStatus()])
    await loadOtherConnectedSite()
    await loadWooConfig()
    if (wooConfigured.value) await loadWooReport()
    if (route.query.google === 'connected') {
      googleConnectedToast.value = true
      if (typeof window !== 'undefined') window.history.replaceState({}, '', `/sites/${siteId.value}`)
      setTimeout(() => { googleConnectedToast.value = false }, 5000)
    }
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
watch(() => route.query.google, () => {
  if (route.query.google === 'connected' && site.value) loadGoogleStatus()
})
</script>
