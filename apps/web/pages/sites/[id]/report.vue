<template>
  <div class="report-page mx-auto max-w-4xl px-6 py-8 print:px-8 print:py-6">
    <div v-if="pending" class="flex justify-center py-12">
      <p class="text-surface-500">Loading report…</p>
    </div>

    <template v-else-if="site">
      <header class="mb-8 border-b border-surface-200 pb-6 print:mb-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-surface-900">{{ site.name }}</h1>
            <p class="mt-1 text-sm text-surface-500">{{ site.domain }}</p>
            <p class="mt-2 text-sm text-surface-600">
              {{ dateRangeLabel }} · Generated {{ generatedAt }}
            </p>
          </div>
          <div class="flex items-center gap-2 print:hidden">
            <button
              type="button"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
              :disabled="exporting"
              @click="exportPdf(rangePreset, comparePreset)"
            >
              {{ exporting ? 'Exporting…' : 'Export PDF' }}
            </button>
            <p v-if="exportError" class="text-sm text-red-600">{{ exportError }}</p>
          </div>
        </div>
      </header>

      <section v-if="!hasGa" class="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p>Connect Google Analytics and select a property to generate reports.</p>
      </section>

      <template v-else>
        <section class="report-section mb-8">
          <h2 class="mb-4 text-lg font-semibold text-surface-900">Performance summary</h2>
          <DashboardWidgetKpiSummary
            :site-id="site.id"
            :range="rangePreset"
            :compare="comparePreset"
            :subtitle="''"
            report-mode
            :show-menu="false"
          />
        </section>

        <section class="report-section mb-8">
          <h2 class="mb-4 text-lg font-semibold text-surface-900">Sessions trend</h2>
          <DashboardWidgetSessionsTrend
            :site-id="site.id"
            :range="rangePreset"
            :compare="comparePreset"
            report-mode
            :show-menu="false"
          />
        </section>

        <section class="report-section mb-8">
          <h2 class="mb-4 text-lg font-semibold text-surface-900">Traffic channels</h2>
          <DashboardWidgetChannels
            :site-id="site.id"
            :range="rangePreset"
            report-mode
            :show-menu="false"
          />
        </section>

        <section class="report-section mb-8">
          <h2 class="mb-4 text-lg font-semibold text-surface-900">Top countries</h2>
          <DashboardWidgetCountries
            :site-id="site.id"
            :range="rangePreset"
            :limit="10"
            report-mode
            :show-menu="false"
          />
        </section>

        <section class="report-section mb-8">
          <h2 class="mb-4 text-lg font-semibold text-surface-900">Top pages</h2>
          <DashboardWidgetTopPages
            :site-id="site.id"
            :range="rangePreset"
            :limit="10"
            report-mode
            :show-menu="false"
          />
        </section>

        <section class="report-section mb-8">
          <h2 class="mb-4 text-lg font-semibold text-surface-900">Landing pages</h2>
          <DashboardWidgetLandingPages
            :site-id="site.id"
            :range="rangePreset"
            :limit="10"
            report-mode
            :show-menu="false"
          />
        </section>

        <section class="report-section mb-8">
          <h2 class="mb-4 text-lg font-semibold text-surface-900">Top events</h2>
          <DashboardWidgetEvents
            :site-id="site.id"
            :range="rangePreset"
            :limit="10"
            report-mode
            :show-menu="false"
          />
        </section>

        <section class="report-section mb-8">
          <h2 class="mb-4 text-lg font-semibold text-surface-900">Ecommerce</h2>
          <DashboardWidgetEcommerce
            :site-id="site.id"
            :range="rangePreset"
            report-mode
            :show-menu="false"
          />
        </section>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import { getSite } from '~/services/sites'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()
const site = ref<SiteRecord | null>(null)
const pending = ref(true)
const { getStatus } = useGoogleIntegration()
const googleStatus = ref<Awaited<ReturnType<typeof getStatus>> | null>(null)

const rangePreset = computed(() => (route.query.range as string) || 'last_28_days')
const comparePreset = computed(() => (route.query.compare as string) || 'previous_period')

const hasGa = computed(() => googleStatus.value?.connected && googleStatus.value?.selectedProperty)

const dateRangeLabel = computed(() => {
  const r = rangePreset.value
  const c = comparePreset.value !== 'none' ? ' (vs previous period)' : ''
  if (r === 'last_7_days') return 'Last 7 days' + c
  if (r === 'last_28_days') return 'Last 28 days' + c
  if (r === 'last_90_days') return 'Last 90 days' + c
  return r + c
})

const generatedAt = ref('')
const { exportPdf, exporting, error: exportError } = useExportPdf(siteId)

onMounted(() => {
  generatedAt.value = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
})

onMounted(() => {
  let done = false
  const check = () => {
    if (done) return
    requestAnimationFrame(() => {
      if (document.readyState === 'complete') {
        setTimeout(() => {
          if (typeof window !== 'undefined') (window as unknown as { __REPORT_READY__?: boolean }).__REPORT_READY__ = true
          done = true
        }, 1500)
      } else check()
    })
  }
  check()
})

async function init() {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
    if (site.value) googleStatus.value = await getStatus(site.value.id).catch(() => null)
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>

<style scoped>
.report-page {
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
.report-section {
  break-inside: avoid;
  page-break-inside: avoid;
}
@media print {
  .report-page { padding: 0; }
}
</style>
