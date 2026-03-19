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
          class="rounded-lg border border-surface-200 px-3 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
        >
          Site settings
        </NuxtLink>
      </div>

      <div class="space-y-6">
        <section class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-lg font-medium text-surface-900">Performance summary</h2>
            <NuxtLink :to="`/sites/${site.id}/dashboard`" class="text-sm font-medium text-primary-600 hover:underline">
              View full report →
            </NuxtLink>
          </div>
          <DashboardWidgetKpiSummary
            :site-id="site.id"
            range="last_28_days"
            compare="previous_period"
            subtitle=""
            report-mode
            :show-menu="false"
          />
        </section>

        <section class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-lg font-medium text-surface-900">Lighthouse</h2>
            <NuxtLink :to="`/sites/${site.id}/lighthouse`" class="text-sm font-medium text-primary-600 hover:underline">
              View details →
            </NuxtLink>
          </div>
          <div v-if="lighthouseLoading" class="py-4 text-sm text-surface-500">Loading scores…</div>
          <div v-else-if="hasLighthouse" class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-lg border border-surface-200 bg-surface-50/50 p-4">
              <p class="mb-2 text-sm font-medium text-surface-600">Mobile</p>
              <div v-if="lighthouseMobile" class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div v-for="cat in lighthouseCategories" :key="`m-${cat}`" class="rounded bg-white p-2 text-center">
                  <p class="text-[11px] text-surface-500">{{ formatLhCategory(cat) }}</p>
                  <p class="mt-1 text-base font-semibold" :class="lighthouseScoreClass(lighthouseMobile.categories?.[cat]?.score)">
                    {{ lighthouseScorePct(lighthouseMobile.categories?.[cat]?.score) }}
                  </p>
                </div>
              </div>
              <p v-else class="text-sm text-surface-500">No report yet.</p>
            </div>
            <div class="rounded-lg border border-surface-200 bg-surface-50/50 p-4">
              <p class="mb-2 text-sm font-medium text-surface-600">Desktop</p>
              <div v-if="lighthouseDesktop" class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div v-for="cat in lighthouseCategories" :key="`d-${cat}`" class="rounded bg-white p-2 text-center">
                  <p class="text-[11px] text-surface-500">{{ formatLhCategory(cat) }}</p>
                  <p class="mt-1 text-base font-semibold" :class="lighthouseScoreClass(lighthouseDesktop.categories?.[cat]?.score)">
                    {{ lighthouseScorePct(lighthouseDesktop.categories?.[cat]?.score) }}
                  </p>
                </div>
              </div>
              <p v-else class="text-sm text-surface-500">No report yet.</p>
            </div>
          </div>
          <p v-else class="text-sm text-surface-500">Connect Lighthouse to see this section.</p>
        </section>

        <section v-if="hasAds" class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-lg font-medium text-surface-900">Google Ads</h2>
            <NuxtLink :to="`/sites/${site.id}/ads`" class="text-sm font-medium text-primary-600 hover:underline">
              View full report →
            </NuxtLink>
          </div>
          <GoogleAdsSummaryWidget :site-id="site.id" />
        </section>

        <section v-if="hasGsc" class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-lg font-medium text-surface-900">Google Search Console</h2>
            <NuxtLink :to="`/sites/${site.id}/search-console`" class="text-sm font-medium text-primary-600 hover:underline">
              View full report →
            </NuxtLink>
          </div>
          <div v-if="gscLoading" class="py-4 text-sm text-surface-500">Loading Search Console…</div>
          <div v-else-if="gscSummary" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-lg border border-surface-200 bg-white p-4">
              <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Clicks</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">{{ gscSummary.clicks.toLocaleString() }}</p>
            </div>
            <div class="rounded-lg border border-surface-200 bg-white p-4">
              <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Impressions</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">{{ gscSummary.impressions.toLocaleString() }}</p>
            </div>
            <div class="rounded-lg border border-surface-200 bg-white p-4">
              <p class="text-xs font-medium uppercase tracking-wide text-surface-500">CTR</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">{{ (gscSummary.ctr * 100).toFixed(2) }}%</p>
            </div>
            <div class="rounded-lg border border-surface-200 bg-white p-4">
              <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Avg position</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">{{ gscSummary.position.toFixed(1) }}</p>
            </div>
          </div>
          <p v-else class="text-sm text-surface-500">No Search Console data for this period.</p>
        </section>

        <section v-if="woocommerceEnabled && wooConfigured" class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-lg font-medium text-surface-900">WooCommerce</h2>
            <NuxtLink :to="`/sites/${site.id}/woocommerce`" class="text-sm font-medium text-primary-600 hover:underline">
              View full report →
            </NuxtLink>
          </div>
          <div v-if="wooReportLoading" class="py-4 text-sm text-surface-500">Loading sales report…</div>
          <div v-else-if="wooReport" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-lg border border-surface-200 bg-emerald-50/40 p-4">
              <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Total revenue</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">{{ formatWooCurrency(wooReport.totalRevenue) }}</p>
            </div>
            <div class="rounded-lg border border-surface-200 bg-white p-4">
              <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Orders</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">{{ wooReport.totalOrders.toLocaleString() }}</p>
            </div>
            <div class="rounded-lg border border-surface-200 bg-white p-4">
              <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Avg order value</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">
                {{ formatWooCurrency(wooReport.totalOrders ? wooReport.totalRevenue / wooReport.totalOrders : 0) }}
              </p>
            </div>
            <div class="rounded-lg border border-surface-200 bg-white p-4">
              <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Days with sales</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">{{ wooReport.revenueByDay?.length ?? 0 }}</p>
            </div>
          </div>
          <p v-else class="text-sm text-surface-500">No WooCommerce data for this period.</p>
        </section>

        <section class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <h2 class="mb-3 text-lg font-medium text-surface-900">Tasks</h2>
          <div class="grid gap-3 sm:grid-cols-3">
            <NuxtLink
              :to="`/sites/${site.id}/site-audit`"
              class="flex items-start gap-3 rounded-lg border border-surface-200 bg-white p-4 transition hover:border-primary-200 hover:shadow-sm"
            >
              <span class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded bg-amber-100 text-amber-700">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </span>
              <div>
                <p class="text-sm font-semibold text-surface-900">Run site audit</p>
                <p class="text-xs text-surface-500">Technical and SEO health checks</p>
              </div>
            </NuxtLink>

            <NuxtLink
              :to="`/sites/${site.id}/rank-tracking`"
              class="flex items-start gap-3 rounded-lg border border-surface-200 bg-white p-4 transition hover:border-primary-200 hover:shadow-sm"
            >
              <span class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded bg-emerald-100 text-emerald-700">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </span>
              <div>
                <p class="text-sm font-semibold text-surface-900">Check rank tracking</p>
                <p class="text-xs text-surface-500">Keywords and positions</p>
              </div>
            </NuxtLink>

            <NuxtLink
              :to="`/sites/${site.id}/research`"
              class="flex items-start gap-3 rounded-lg border border-surface-200 bg-white p-4 transition hover:border-primary-200 hover:shadow-sm"
            >
              <span class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded bg-violet-100 text-violet-700">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16l2.5-2.5L13 16l5-5M4 20h16M5 4h14v8H5V4z" />
                </svg>
              </span>
              <div>
                <p class="text-sm font-semibold text-surface-900">Research</p>
                <p class="text-xs text-surface-500">Competitors and keyword ideas</p>
              </div>
            </NuxtLink>
          </div>
        </section>
      </div>
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
const { getStatus } = useGoogleIntegration()

const site = ref<SiteRecord | null>(null)
const googleStatus = ref<GoogleStatusResponse | null>(null)
const pending = ref(true)

const hasAds = computed(() => !!googleStatus.value?.connected && !!googleStatus.value?.selectedAdsCustomer)
const hasLighthouse = computed(() => googleStatus.value?.providers?.lighthouse?.status === 'connected')
const hasGsc = computed(() => !!googleStatus.value?.connected && !!googleStatus.value?.selectedSearchConsoleSite)
const woocommerceEnabled = (useRuntimeConfig().public as { woocommerceEnabled?: boolean }).woocommerceEnabled !== false

const lighthouseLoading = ref(false)
const lighthouseMobile = ref<{ categories?: Record<string, { score?: number }> } | null>(null)
const lighthouseDesktop = ref<{ categories?: Record<string, { score?: number }> } | null>(null)
const lighthouseCategories = ['performance', 'accessibility', 'best-practices', 'seo'] as const

const wooReport = ref<{
  startDate: string
  endDate: string
  totalRevenue: number
  totalOrders: number
  revenueByDay: Array<{ date: string; value: number }>
} | null>(null)
const wooReportLoading = ref(false)
const wooConfigured = ref(false)
const gscLoading = ref(false)
const gscSummary = ref<{ clicks: number; impressions: number; ctr: number; position: number } | null>(null)

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatLhCategory(id: string): string {
  if (id === 'best-practices') return 'Best practices'
  return id.charAt(0).toUpperCase() + id.slice(1)
}

function lighthouseScorePct(score: number | undefined): string {
  if (score == null) return '—'
  return Math.round(score * 100).toString()
}

function lighthouseScoreClass(score: number | undefined): string {
  if (score == null) return 'text-surface-400'
  const v = score * 100
  if (v >= 90) return 'text-green-600'
  if (v >= 50) return 'text-amber-600'
  return 'text-red-600'
}

function formatWooCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value)
}

async function loadLighthouseReports() {
  if (!site.value || !hasLighthouse.value) return
  lighthouseLoading.value = true
  try {
    const [mobile, desktop] = await Promise.all([
      $fetch<{ categories?: Record<string, { score?: number }> } | null>('/api/lighthouse/report', {
        query: { siteId: site.value.id, strategy: 'mobile' },
        headers: authHeaders(),
      }).catch(() => null),
      $fetch<{ categories?: Record<string, { score?: number }> } | null>('/api/lighthouse/report', {
        query: { siteId: site.value.id, strategy: 'desktop' },
        headers: authHeaders(),
      }).catch(() => null),
    ])
    lighthouseMobile.value = mobile
    lighthouseDesktop.value = desktop
  } finally {
    lighthouseLoading.value = false
  }
}

async function loadWooSummary() {
  if (!site.value || !woocommerceEnabled) return
  wooReportLoading.value = true
  try {
    const conf = await $fetch<{ configured: boolean }>('/api/woocommerce/config', {
      query: { siteId: site.value.id },
      headers: authHeaders(),
    }).catch(() => ({ configured: false }))
    wooConfigured.value = !!conf.configured
    if (!conf.configured) {
      wooReport.value = null
      return
    }
    const endD = new Date()
    const startD = new Date()
    startD.setDate(startD.getDate() - 30)
    const startDate = startD.toISOString().slice(0, 10)
    const endDate = endD.toISOString().slice(0, 10)
    wooReport.value = await $fetch<typeof wooReport.value>('/api/woocommerce/report', {
      query: { siteId: site.value.id, startDate, endDate },
      headers: authHeaders(),
    }).catch(() => null)
  } finally {
    wooReportLoading.value = false
  }
}

async function loadGscSummary() {
  if (!site.value || !hasGsc.value) {
    gscSummary.value = null
    return
  }
  gscLoading.value = true
  try {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 27)
    const startDate = start.toISOString().slice(0, 10)
    const endDate = end.toISOString().slice(0, 10)
    const res = await $fetch<{ summary?: { clicks: number; impressions: number; ctr: number; position: number } }>(
      '/api/google/search-console/report',
      {
        query: { siteId: site.value.id, startDate, endDate },
        headers: authHeaders(),
      }
    ).catch(() => ({}))
    gscSummary.value = res.summary ?? null
  } finally {
    gscLoading.value = false
  }
}

async function init() {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
    if (!site.value) return
    googleStatus.value = await getStatus(site.value.id).catch(() => null)
    await Promise.all([loadLighthouseReports(), loadWooSummary(), loadGscSummary()])
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>
