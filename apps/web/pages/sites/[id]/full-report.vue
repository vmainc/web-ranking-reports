<template>
  <div class="full-report-page mx-auto max-w-4xl px-6 py-8 print:px-8 print:py-6">
    <div v-if="pending" class="flex justify-center py-12">
      <p class="text-surface-500">Loading report…</p>
    </div>

    <template v-else-if="site">
      <!-- Cover -->
      <header class="cover-page mb-12 flex min-h-[60vh] flex-col justify-center border-b border-surface-200 pb-12 print:min-h-0 print:py-12">
        <h1 class="text-4xl font-bold tracking-tight text-surface-900 print:text-3xl">{{ site.name }}</h1>
        <p class="mt-2 text-lg text-surface-600">{{ site.domain }}</p>
        <p class="mt-8 text-2xl font-semibold text-primary-600 print:text-xl">Full Report</p>
        <p class="mt-4 text-sm text-surface-500">Generated {{ generatedAt }}</p>
        <p class="mt-2 text-sm text-surface-500">{{ dateRangeLabel }}</p>
        <div class="mt-8 flex flex-col gap-3 print:hidden">
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
              :disabled="exporting"
              @click="exportPdf"
            >
              {{ exporting ? 'Exporting…' : 'Export PDF' }}
            </button>
            <button
              type="button"
              class="rounded-lg border border-primary-600 bg-white px-4 py-2.5 text-sm font-semibold text-primary-600 hover:bg-primary-50 disabled:opacity-50"
              :disabled="saving"
              @click="saveReport"
            >
              {{ saving ? 'Saving…' : reportId ? 'Save report' : 'Save report (add to Reports)' }}
            </button>
            <NuxtLink :to="`/sites/${site.id}`" class="rounded-lg border border-surface-300 px-4 py-2.5 text-sm font-medium text-surface-700 hover:bg-surface-50">
              Back to site
            </NuxtLink>
          </div>
          <p v-if="saveMessage" class="text-sm" :class="saveError ? 'text-red-600' : 'text-green-600'">{{ saveMessage }}</p>
          <p v-if="exportError" class="text-sm text-red-600">{{ exportError }}</p>
        </div>
      </header>

      <!-- Table of contents + layout controls -->
      <nav id="toc" class="report-section toc mb-6 rounded-xl border border-surface-200 bg-surface-50/50 p-6 print:break-inside-avoid">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-surface-900">Table of contents</h2>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-surface-300 px-3 py-1.5 text-xs font-medium text-surface-700 shadow-sm hover:bg-surface-50 print:hidden"
            @click="showEditSections = true"
          >
            <span class="inline-block h-1 w-3 rounded bg-surface-400"></span>
            <span>Edit sections</span>
          </button>
        </div>
        <ol class="list-decimal space-y-2 pl-5 text-sm">
          <li v-for="item in tocItems" :key="item.id">
            <a :href="`#${item.id}`" class="text-primary-600 hover:underline print:no-underline">{{ item.title }}</a>
          </li>
        </ol>
      </nav>

      <!-- 1. Performance summary -->
      <section v-if="isSectionEnabled('performance-summary')" id="performance-summary" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">1. Performance summary</h2>
        <section v-if="!hasGa" class="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <p>Connect Google Analytics and select a property to see this section.</p>
        </section>
        <DashboardWidgetKpiSummary
          v-else
          :site-id="site.id"
          :range="rangePreset"
          :compare="comparePreset"
          subtitle=""
          report-mode
          :show-menu="false"
        />
      </section>

      <!-- 2. Sessions trend -->
      <section v-if="isSectionEnabled('sessions-trend')" id="sessions-trend" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">2. Sessions trend</h2>
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google Analytics to see this section.</section>
        <DashboardWidgetSessionsTrend v-else :site-id="site.id" :range="rangePreset" :compare="comparePreset" report-mode :show-menu="false" />
      </section>

      <!-- 3. Traffic channels -->
      <section v-if="isSectionEnabled('traffic-channels')" id="traffic-channels" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">3. Traffic channels</h2>
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google Analytics to see this section.</section>
        <DashboardWidgetChannels v-else :site-id="site.id" :range="rangePreset" report-mode :show-menu="false" />
      </section>

      <!-- 4. Top countries -->
      <section v-if="isSectionEnabled('top-countries')" id="top-countries" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">4. Top countries</h2>
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google Analytics to see this section.</section>
        <DashboardWidgetCountries v-else :site-id="site.id" :range="rangePreset" :limit="10" report-mode :show-menu="false" />
      </section>

      <!-- 5. Top pages -->
      <section v-if="isSectionEnabled('top-pages')" id="top-pages" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">5. Top pages</h2>
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google Analytics to see this section.</section>
        <DashboardWidgetTopPages v-else :site-id="site.id" :range="rangePreset" :limit="10" report-mode :show-menu="false" />
      </section>

      <!-- 6. Landing pages -->
      <section v-if="isSectionEnabled('landing-pages')" id="landing-pages" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">6. Landing pages</h2>
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google Analytics to see this section.</section>
        <DashboardWidgetLandingPages v-else :site-id="site.id" :range="rangePreset" :limit="10" report-mode :show-menu="false" />
      </section>

      <!-- 7. Top events -->
      <section v-if="isSectionEnabled('top-events')" id="top-events" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">7. Top events</h2>
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google Analytics to see this section.</section>
        <DashboardWidgetEvents v-else :site-id="site.id" :range="rangePreset" :limit="10" report-mode :show-menu="false" />
      </section>

      <!-- 8. Ecommerce -->
      <section v-if="isSectionEnabled('ecommerce')" id="ecommerce" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">8. Ecommerce</h2>
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google Analytics to see this section.</section>
        <DashboardWidgetEcommerce v-else :site-id="site.id" :range="rangePreset" report-mode :show-menu="false" />
      </section>

      <!-- 9. Retention -->
      <section v-if="isSectionEnabled('retention')" id="retention" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">9. Retention</h2>
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google Analytics to see this section.</section>
        <DashboardWidgetRetention v-else :site-id="site.id" :range="rangePreset" report-mode :show-menu="false" />
      </section>

      <!-- 10. Google Ads -->
      <section v-if="isSectionEnabled('google-ads')" id="google-ads" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">10. Google Ads</h2>
        <section v-if="!hasAds" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google Ads for this site to see this section.</section>
        <GoogleAdsSummaryWidget v-else :site-id="site.id" />
      </section>

      <!-- 11. WooCommerce -->
      <section v-if="isSectionEnabled('woocommerce')" id="woocommerce" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">11. WooCommerce</h2>
        <section v-if="!wooConfigured" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Configure WooCommerce for this site to see this section.</section>
        <template v-else>
          <div v-if="wooLoading" class="rounded-lg border border-surface-200 p-6 text-center text-sm text-surface-500">Loading…</div>
          <div v-else-if="wooReport" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
              <p class="text-sm font-medium text-surface-500">Total revenue</p>
              <p class="mt-1 text-xl font-semibold text-surface-900">{{ formatCurrency(wooReport.totalRevenue) }}</p>
              <p class="mt-0.5 text-xs text-surface-500">{{ wooReport.startDate }} – {{ wooReport.endDate }}</p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
              <p class="text-sm font-medium text-surface-500">Orders</p>
              <p class="mt-1 text-xl font-semibold text-surface-900">{{ wooReport.totalOrders.toLocaleString() }}</p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
              <p class="text-sm font-medium text-surface-500">Avg order value</p>
              <p class="mt-1 text-xl font-semibold text-surface-900">{{ formatCurrency(wooReport.totalOrders ? wooReport.totalRevenue / wooReport.totalOrders : 0) }}</p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
              <p class="text-sm font-medium text-surface-500">Days with sales</p>
              <p class="mt-1 text-xl font-semibold text-surface-900">{{ wooReport.revenueByDay?.length ?? 0 }}</p>
            </div>
          </div>
          <p v-else class="rounded-lg border border-surface-200 p-6 text-sm text-surface-500">No sales data for the period.</p>
        </template>
      </section>

      <!-- 12. Search Console -->
      <section v-if="isSectionEnabled('search-console')" id="search-console" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">12. Search Console</h2>
        <section v-if="!hasGsc" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google and select a Search Console property to see this section.</section>
        <template v-else>
          <div v-if="gscLoading" class="rounded-lg border border-surface-200 p-6 text-center text-sm text-surface-500">Loading…</div>
          <div v-else-if="gscSummary" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
              <p class="text-sm font-medium text-surface-500">Clicks</p>
              <p class="mt-1 text-xl font-semibold text-surface-900">{{ gscSummary.clicks.toLocaleString() }}</p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
              <p class="text-sm font-medium text-surface-500">Impressions</p>
              <p class="mt-1 text-xl font-semibold text-surface-900">{{ gscSummary.impressions.toLocaleString() }}</p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
              <p class="text-sm font-medium text-surface-500">CTR</p>
              <p class="mt-1 text-xl font-semibold text-surface-900">{{ (gscSummary.ctr * 100).toFixed(2) }}%</p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
              <p class="text-sm font-medium text-surface-500">Avg position</p>
              <p class="mt-1 text-xl font-semibold text-surface-900">{{ gscSummary.position.toFixed(1) }}</p>
            </div>
          </div>
          <p v-else class="rounded-lg border border-surface-200 p-6 text-sm text-surface-500">No Search Console data for the period.</p>
        </template>
      </section>

      <!-- 13. Lighthouse -->
      <section v-if="isSectionEnabled('lighthouse')" id="lighthouse" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">13. Lighthouse</h2>
        <section v-if="!lighthouseData" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Run Lighthouse from the site page to see scores here.</section>
        <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="cat in lighthouseCategories" :key="cat.id" class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-medium text-surface-500">{{ cat.title }}</p>
            <p class="mt-1 text-2xl font-bold" :class="lighthouseScoreClass(cat.score)">{{ cat.score != null ? Math.round(cat.score * 100) : '—' }}</p>
          </div>
        </div>
      </section>

      <!-- 14. Site Audit -->
      <section v-if="isSectionEnabled('site-audit')" id="site-audit" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">14. Site audit</h2>
        <section v-if="!auditResult" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Run a Site Audit from the site page to see findings here.</section>
        <template v-else>
          <p class="mb-4 text-sm text-surface-700">{{ auditResult.summary }}</p>
          <p class="mb-4 text-xs text-surface-500">Audited {{ auditResult.url }} · {{ formatDate(auditResult.fetchedAt) }}</p>
          <div v-if="auditResult.issues.length" class="space-y-2">
            <p class="text-sm font-medium text-surface-700">{{ auditResult.issues.length }} finding(s)</p>
            <div class="flex flex-wrap gap-2">
              <span v-if="auditErrors" class="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">{{ auditErrors }} error(s)</span>
              <span v-if="auditWarnings" class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">{{ auditWarnings }} warning(s)</span>
              <span v-if="auditInfos" class="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">{{ auditInfos }} info</span>
            </div>
          </div>
          <p v-else class="text-sm text-surface-500">No issues reported.</p>
        </template>
      </section>

      <!-- 15. Rank tracking -->
      <section v-if="isSectionEnabled('rank-tracking')" id="rank-tracking" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">15. Rank tracking</h2>
        <section class="rounded-lg border border-surface-200 bg-surface-50 p-6">
          <p v-if="rankKeywordsLoading" class="text-sm text-surface-500">Loading…</p>
          <p v-else class="text-sm text-surface-700">{{ rankKeywordsCount }} keyword(s) tracked. View full rankings on the site Rank tracking page.</p>
        </section>
      </section>

      <!-- 16. Lead generation -->
      <section v-if="isSectionEnabled('lead-generation')" id="lead-generation" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">16. Lead generation</h2>
        <section class="rounded-lg border border-surface-200 bg-surface-50 p-6">
          <p v-if="leadStatsLoading" class="text-sm text-surface-500">Loading…</p>
          <p v-else class="text-sm text-surface-700">{{ leadFormsCount }} form(s), {{ leadSubmissionsCount }} submission(s) total. View forms and leads on the site Lead generation page.</p>
        </section>
      </section>

      <div class="mt-12 border-t border-surface-200 pt-8 print:hidden">
        <NuxtLink :to="`/sites/${site.id}`" class="text-primary-600 hover:underline">← Back to {{ site.name }}</NuxtLink>
      </div>
    </template>
  </div>

  <!-- Edit sections modal -->
  <Teleport to="body">
    <div
      v-if="showEditSections"
      class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 print:hidden"
      @click.self="showEditSections = false"
    >
      <div class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-base font-semibold text-surface-900">Edit report sections</h2>
          <button type="button" class="text-sm text-surface-500 hover:text-surface-700" @click="showEditSections = false">
            Close
          </button>
        </div>
        <p class="mb-3 text-xs text-surface-500">
          Turn sections on or off and reorder them. This only affects how the full report is laid out for this site.
        </p>
        <ul class="max-h-80 space-y-2 overflow-y-auto pr-1 text-sm">
          <li
            v-for="section in orderedSections"
            :key="section.id"
            class="flex items-center justify-between gap-2 rounded-lg border border-surface-200 px-3 py-2"
          >
            <label class="flex flex-1 items-center gap-2">
              <input v-model="section.enabled" type="checkbox" class="h-3.5 w-3.5 rounded border-surface-300 text-primary-600" />
              <span class="font-medium text-surface-800">{{ section.title }}</span>
            </label>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="rounded border border-surface-200 px-1.5 py-0.5 text-xs text-surface-500 hover:bg-surface-50 disabled:opacity-40"
                :disabled="isFirstSection(section.id)"
                @click="moveSectionUp(section.id)"
              >
                ↑
              </button>
              <button
                type="button"
                class="rounded border border-surface-200 px-1.5 py-0.5 text-xs text-surface-500 hover:bg-surface-50 disabled:opacity-40"
                :disabled="isLastSection(section.id)"
                @click="moveSectionDown(section.id)"
              >
                ↓
              </button>
            </div>
          </li>
        </ul>
        <div class="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            class="text-xs text-surface-500 hover:text-surface-700"
            @click="resetSectionsToDefault"
          >
            Reset to defaults
          </button>
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-500"
            @click="showEditSections = false"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import { getSite } from '~/services/sites'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'
import { useExportPdf } from '~/composables/useExportPdf'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()
const site = ref<SiteRecord | null>(null)
const pending = ref(true)
const { getStatus } = useGoogleIntegration()
const googleStatus = ref<Awaited<ReturnType<typeof getStatus>> | null>(null)

const reportId = computed(() => (route.query.reportId as string) || '')
const rangePreset = computed(() => (route.query.range as string) || 'last_28_days')
const comparePreset = computed(() => (route.query.compare as string) || 'previous_period')
const hasGa = computed(() => googleStatus.value?.connected && googleStatus.value?.selectedProperty)
const hasAds = computed(() => !!googleStatus.value?.connected && !!googleStatus.value?.selectedAdsCustomer)
const hasGsc = computed(() => !!googleStatus.value?.connected && !!googleStatus.value?.selectedSearchConsoleSite)

const dateRangeLabel = computed(() => {
  const r = rangePreset.value
  const c = comparePreset.value !== 'none' ? ' (vs previous period)' : ''
  if (r === 'last_7_days') return 'Last 7 days' + c
  if (r === 'last_28_days') return 'Last 28 days' + c
  if (r === 'last_90_days') return 'Last 90 days' + c
  return r + c
})

const generatedAt = ref('')
const { exportPdf: exportPdfFn, exporting, error: exportError } = useExportPdf(siteId)
function exportPdf() {
  exportPdfFn(rangePreset.value, comparePreset.value !== 'none' ? 'previous_period' : 'none', true)
}

type ReportSectionConfig = {
  id: string
  title: string
  enabled: boolean
  order: number
}

const defaultSections: ReportSectionConfig[] = [
  { id: 'performance-summary', title: 'Performance summary', enabled: true, order: 1 },
  { id: 'sessions-trend', title: 'Sessions trend', enabled: true, order: 2 },
  { id: 'traffic-channels', title: 'Traffic channels', enabled: true, order: 3 },
  { id: 'top-countries', title: 'Top countries', enabled: true, order: 4 },
  { id: 'top-pages', title: 'Top pages', enabled: true, order: 5 },
  { id: 'landing-pages', title: 'Landing pages', enabled: true, order: 6 },
  { id: 'top-events', title: 'Top events', enabled: true, order: 7 },
  { id: 'ecommerce', title: 'Ecommerce', enabled: true, order: 8 },
  { id: 'retention', title: 'Retention', enabled: true, order: 9 },
  { id: 'google-ads', title: 'Google Ads', enabled: true, order: 10 },
  { id: 'woocommerce', title: 'WooCommerce', enabled: true, order: 11 },
  { id: 'search-console', title: 'Search Console', enabled: true, order: 12 },
  { id: 'lighthouse', title: 'Lighthouse', enabled: true, order: 13 },
  { id: 'site-audit', title: 'Site audit', enabled: true, order: 14 },
  { id: 'rank-tracking', title: 'Rank tracking', enabled: true, order: 15 },
  { id: 'lead-generation', title: 'Lead generation', enabled: true, order: 16 },
]

const showEditSections = ref(false)
const sectionsConfig = ref<ReportSectionConfig[]>([...defaultSections])
const saving = ref(false)
const saveMessage = ref('')
const saveError = ref(false)

const orderedSections = computed(() =>
  [...sectionsConfig.value].sort((a, b) => a.order - b.order),
)

const tocItems = computed(() =>
  orderedSections.value.filter((s) => s.enabled).map((s) => ({ id: s.id, title: s.title })),
)

function isSectionEnabled(id: string): boolean {
  const found = sectionsConfig.value.find((s) => s.id === id)
  return found ? found.enabled : true
}

function persistSections() {
  if (reportId.value || typeof window === 'undefined') return
  const key = `full_report_sections_${siteId.value}`
  try {
    window.localStorage.setItem(key, JSON.stringify(sectionsConfig.value))
  } catch {
    // ignore
  }
}

function applySectionsFromPayload(payload: unknown) {
  const sections = Array.isArray((payload as { sections?: unknown })?.sections)
    ? (payload as { sections: Partial<ReportSectionConfig>[] }).sections
    : null
  if (!sections?.length) return
  const merged = defaultSections.map((def) => {
    const override = sections.find((p) => p.id === def.id)
    return {
      ...def,
      enabled: override?.enabled ?? def.enabled,
      order: typeof override?.order === 'number' ? override.order : def.order,
    }
  })
  merged.sort((a, b) => a.order - b.order)
  merged.forEach((s, idx) => {
    s.order = idx + 1
  })
  sectionsConfig.value = merged
}

async function loadReportSections() {
  if (!reportId.value) return
  try {
    const report = await $fetch<{ payload_json?: { sections?: Partial<ReportSectionConfig>[] } }>(
      `/api/reports/${reportId.value}`,
      { headers: authHeaders() }
    )
    if (report?.payload_json?.sections?.length) applySectionsFromPayload(report.payload_json)
  } catch {
    // keep current sections (default or localStorage)
  }
}

function loadSectionsForSite() {
  if (typeof window === 'undefined') {
    sectionsConfig.value = [...defaultSections]
    return
  }
  if (reportId.value) {
    return
  }
  const key = `full_report_sections_${siteId.value}`
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      sectionsConfig.value = [...defaultSections]
      return
    }
    const parsed = JSON.parse(raw) as Partial<ReportSectionConfig>[]
    const merged = defaultSections.map((def) => {
      const override = parsed.find((p) => p.id === def.id)
      return {
        ...def,
        enabled: override?.enabled ?? def.enabled,
        order: typeof override?.order === 'number' ? override.order : def.order,
      }
    })
    merged.sort((a, b) => a.order - b.order)
    merged.forEach((s, idx) => {
      s.order = idx + 1
    })
    sectionsConfig.value = merged
  } catch {
    sectionsConfig.value = [...defaultSections]
  }
}

async function saveReport() {
  if (!site.value) return
  saving.value = true
  saveMessage.value = ''
  saveError.value = false
  try {
    const payload = {
      sections: sectionsConfig.value,
      rangePreset: rangePreset.value,
      comparePreset: comparePreset.value,
      generatedAt: generatedAt.value,
    }
    if (reportId.value) {
      await $fetch(`/api/reports/${reportId.value}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: { payload_json: payload },
      })
      saveMessage.value = 'Report settings saved.'
    } else {
      const { report } = await $fetch<{ report: { id: string } }>('/api/reports/create', {
        method: 'POST',
        headers: authHeaders(),
        body: { siteId: site.value.id },
      })
      await $fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: { payload_json: payload },
      })
      saveMessage.value = 'Report saved and added to your Reports list.'
      navigateTo({
        path: `/sites/${site.value.id}/full-report`,
        query: { reportId: report.id, range: rangePreset.value, compare: comparePreset.value },
      })
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    saveError.value = true
    saveMessage.value = err?.data?.message ?? err?.message ?? 'Failed to save report.'
  } finally {
    saving.value = false
  }
}

function resetSectionsToDefault() {
  sectionsConfig.value = [...defaultSections]
  persistSections()
}

function moveSectionUp(id: string) {
  const list = orderedSections.value
  const index = list.findIndex((s) => s.id === id)
  if (index <= 0) return
  const swapped = [...list]
  const tmp = swapped[index - 1]
  swapped[index - 1] = swapped[index]
  swapped[index] = tmp
  swapped.forEach((s, idx) => {
    s.order = idx + 1
  })
  sectionsConfig.value = swapped
  persistSections()
}

function moveSectionDown(id: string) {
  const list = orderedSections.value
  const index = list.findIndex((s) => s.id === id)
  if (index === -1 || index >= list.length - 1) return
  const swapped = [...list]
  const tmp = swapped[index + 1]
  swapped[index + 1] = swapped[index]
  swapped[index] = tmp
  swapped.forEach((s, idx) => {
    s.order = idx + 1
  })
  sectionsConfig.value = swapped
  persistSections()
}

function isFirstSection(id: string): boolean {
  const list = orderedSections.value
  return list[0]?.id === id
}

function isLastSection(id: string): boolean {
  const list = orderedSections.value
  return list[list.length - 1]?.id === id
}

const wooReport = ref<{ totalRevenue: number; totalOrders: number; startDate: string; endDate: string; revenueByDay?: unknown[] } | null>(null)
const wooLoading = ref(false)
const wooConfigured = ref(false)
const gscSummary = ref<{ clicks: number; impressions: number; ctr: number; position: number } | null>(null)
const gscLoading = ref(false)
const lighthouseData = ref<{ categories?: Record<string, { id?: string; title?: string; score?: number }> } | null>(null)
const auditResult = ref<{ summary: string; url: string; fetchedAt: string; issues: Array<{ severity?: string }> } | null>(null)
const rankKeywordsCount = ref(0)
const rankKeywordsLoading = ref(false)
const leadFormsCount = ref(0)
const leadSubmissionsCount = ref(0)
const leadStatsLoading = ref(false)

const lighthouseCategories = computed(() => {
  const cat = lighthouseData.value?.categories
  if (!cat) return []
  const ids = ['performance', 'accessibility', 'best-practices', 'seo']
  return ids.map((id) => ({ id, title: cat[id]?.title ?? id, score: cat[id]?.score }))
})
const auditErrors = computed(() => auditResult.value?.issues.filter((i) => i.severity === 'error').length ?? 0)
const auditWarnings = computed(() => auditResult.value?.issues.filter((i) => i.severity === 'warning').length ?? 0)
const auditInfos = computed(() => auditResult.value?.issues.filter((i) => i.severity === 'info').length ?? 0)

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}
function formatDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}
function formatCurrency(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n)
}
function lighthouseScoreClass(score: number | undefined) {
  if (score == null) return 'text-surface-400'
  const v = score * 100
  if (v >= 90) return 'text-green-600'
  if (v >= 50) return 'text-amber-600'
  return 'text-red-600'
}

function dateRangeToStartEnd(range: string): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  if (range === 'last_7_days') start.setDate(end.getDate() - 6)
  else if (range === 'last_90_days') start.setDate(end.getDate() - 89)
  else start.setDate(end.getDate() - 27)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

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
        }, 2500)
      } else check()
    })
  }
  check()
})

watch(
  () => siteId.value,
  () => {
    loadSectionsForSite()
  },
  { immediate: true },
)

watch(reportId, (id) => {
  if (id) loadReportSections()
})

watch(
  sectionsConfig,
  () => {
    persistSections()
  },
  { deep: true },
)

async function init() {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
    if (site.value) {
      if (reportId.value) await loadReportSections()
      googleStatus.value = await getStatus(site.value.id).catch(() => null)
      wooLoading.value = true
      wooConfigured.value = false
      wooReport.value = null
      try {
        const wooRes = await $fetch<{ configured: boolean }>('/api/woocommerce/config', { headers: authHeaders(), query: { siteId: site.value.id } }).catch(() => ({ configured: false }))
        wooConfigured.value = wooRes?.configured ?? false
        if (wooConfigured.value) {
          const woo = await $fetch<typeof wooReport.value>('/api/woocommerce/report', { headers: authHeaders(), query: { siteId: site.value.id } }).catch(() => null)
          wooReport.value = woo
        }
      } finally {
        wooLoading.value = false
      }
      if (hasGsc.value) {
        gscLoading.value = true
        try {
          const { startDate, endDate } = dateRangeToStartEnd(rangePreset.value)
          const gsc = await $fetch<{ summary?: { clicks: number; impressions: number; ctr: number; position: number } }>('/api/google/search-console/report', {
            headers: authHeaders(),
            query: { siteId: site.value.id, dimension: 'date', startDate, endDate },
          }).catch(() => null)
          gscSummary.value = gsc?.summary ?? null
        } finally {
          gscLoading.value = false
        }
      }
      const lh = await $fetch<typeof lighthouseData.value>('/api/lighthouse/report', { headers: authHeaders(), query: { siteId: site.value.id } }).catch(() => null)
      lighthouseData.value = lh
      const audit = await $fetch<{ result?: typeof auditResult.value }>(`/api/site-audit/${site.value.id}`, { headers: authHeaders() }).catch(() => ({}))
      auditResult.value = audit?.result ?? null
      rankKeywordsLoading.value = true
      try {
        const rank = await $fetch<{ keywords: unknown[] }>(`/api/sites/${site.value.id}/rank-tracking/list`, { headers: authHeaders() }).catch(() => ({ keywords: [] }))
        rankKeywordsCount.value = rank?.keywords?.length ?? 0
      } finally {
        rankKeywordsLoading.value = false
      }
      leadStatsLoading.value = true
      try {
        const [formsRes, leadsRes] = await Promise.all([
          $fetch<{ forms: unknown[] }>(`/api/sites/${site.value.id}/lead-forms/list`, { headers: authHeaders() }).catch(() => ({ forms: [] })),
          $fetch<{ leads: unknown[] }>(`/api/sites/${site.value.id}/leads/list`, { headers: authHeaders() }).catch(() => ({ leads: [] })),
        ])
        leadFormsCount.value = formsRes?.forms?.length ?? 0
        leadSubmissionsCount.value = leadsRes?.leads?.length ?? 0
      } finally {
        leadStatsLoading.value = false
      }
    }
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>

<style scoped>
.full-report-page {
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
.cover-page {
  page-break-after: always;
}
.report-section {
  break-inside: avoid;
  page-break-inside: avoid;
}
.toc {
  break-inside: avoid;
}
@media print {
  .full-report-page { padding: 0; }
}
</style>
