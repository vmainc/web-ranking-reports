<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'
import { useFullReportSectionData } from '~/composables/useFullReportSectionData'
import type { ReportSectionId } from '~/utils/reportLayoutPresets'
import { REPORT_SECTION_LABELS } from '~/utils/reportLayoutPresets'
import { filterReportableRankKeywords } from '~/utils/rankKeywordReport'

const props = defineProps<{
  module: Extract<ReportModule, { type: 'full_report_section' }>
}>()

const siteIdRef = inject<Ref<string | null>>(
  'reportBuilderSiteId',
  ref(null),
)

const siteId = computed(() => siteIdRef.value)

const woocommerceEnabled = (useRuntimeConfig().public as { woocommerceEnabled?: boolean }).woocommerceEnabled !== false

const {
  pending: dataPending,
  hasGa,
  hasAds,
  hasGsc,
  comparePreset,
  wooReport,
  wooLoading,
  wooConfigured,
  gscSummary,
  gscLoading,
  lighthouseMobile,
  lighthouseDesktop,
  auditResult,
  rankKeywords,
  rankKeywordsLoading,
  backlinksData,
  backlinksLoading,
} = useFullReportSectionData({
  siteId: () => siteId.value,
  sectionId: () => props.module.settings.sectionId,
  rangePreset: () => props.module.settings.rangePreset,
  compareToPrevious: () => props.module.settings.compareToPrevious,
})

const sectionId = computed(() => props.module.settings.sectionId)
const rangePreset = computed(() => props.module.settings.rangePreset)

type LighthousePayload = { categories?: Record<string, { id?: string; title?: string; score?: number }> } | null

function lighthouseCategoriesFrom(data: LighthousePayload) {
  const cat = data?.categories
  if (!cat) return []
  const ids = ['performance', 'accessibility', 'best-practices', 'seo'] as const
  return ids.map((id) => ({ id, title: cat[id]?.title ?? id, score: cat[id]?.score }))
}

function lighthouseScoreClass(score: number | undefined) {
  if (score == null) return 'text-slate-400'
  const v = score * 100
  if (v >= 90) return 'text-emerald-700'
  if (v >= 50) return 'text-amber-700'
  return 'text-red-700'
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

const auditErrors = computed(() => auditResult.value?.issues.filter((i) => i.severity === 'error').length ?? 0)
const auditWarnings = computed(() => auditResult.value?.issues.filter((i) => i.severity === 'warning').length ?? 0)
const auditInfos = computed(() => auditResult.value?.issues.filter((i) => i.severity === 'info').length ?? 0)

const rankedRankKeywords = computed(() => filterReportableRankKeywords(rankKeywords.value))

const filteredRankKeywords = computed(() => {
  const include = new Set(props.module.settings.rankKeywordIncludeIds ?? [])
  const exclude = new Set(props.module.settings.rankKeywordExcludeIds ?? [])
  return rankedRankKeywords.value.filter((row) => {
    if (exclude.has(row.id)) return false
    if (include.size > 0) return include.has(row.id)
    return true
  })
})

function sectionLabel(id: ReportSectionId) {
  return REPORT_SECTION_LABELS[id] ?? id
}
</script>

<template>
  <div class="legacy-full-report-section rounded-xl border border-surface-100 bg-surface-50/60 p-3 text-sm">
    <p v-if="!siteId" class="text-amber-800">
      Link this report to a site to load classic sections (save from “Build a report” with a site selected).
    </p>
    <p v-else-if="dataPending" class="text-surface-500">Loading {{ sectionLabel(sectionId) }}…</p>

    <template v-else>
      <!-- performance-summary -->
      <template v-if="sectionId === 'performance-summary'">
        <section v-if="!hasGa" class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Connect Google Analytics and select a property to see this section.
        </section>
        <template v-else>
          <DashboardWidgetKpiSummary
            :site-id="siteId"
            :range="rangePreset"
            :compare="comparePreset"
            subtitle=""
            report-mode
            :show-menu="false"
          />
          <DashboardWidgetUsersTrend
            class="mt-3"
            :site-id="siteId"
            :range="rangePreset"
            :compare="comparePreset"
            subtitle=""
            report-mode
            :show-menu="false"
          />
        </template>
      </template>

      <!-- sessions-trend -->
      <template v-else-if="sectionId === 'sessions-trend'">
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-4 text-surface-500">
          Connect Google Analytics to see this section.
        </section>
        <DashboardWidgetSessionsTrend
          v-else
          :site-id="siteId"
          :range="rangePreset"
          :compare="comparePreset"
          report-mode
          :show-menu="false"
        />
      </template>

      <!-- traffic-channels -->
      <template v-else-if="sectionId === 'traffic-channels'">
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-4 text-surface-500">
          Connect Google Analytics to see this section.
        </section>
        <DashboardWidgetChannels v-else :site-id="siteId" :range="rangePreset" report-mode :show-menu="false" />
      </template>

      <!-- retention -->
      <template v-else-if="sectionId === 'retention'">
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-4 text-surface-500">
          Connect Google Analytics to see this section.
        </section>
        <DashboardWidgetRetention v-else :site-id="siteId" :range="rangePreset" report-mode :show-menu="false" />
      </template>

      <!-- top-countries -->
      <template v-else-if="sectionId === 'top-countries'">
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-4 text-surface-500">
          Connect Google Analytics to see this section.
        </section>
        <DashboardWidgetCountries v-else :site-id="siteId" :range="rangePreset" :limit="10" report-mode :show-menu="false" />
      </template>

      <!-- top-pages -->
      <template v-else-if="sectionId === 'top-pages'">
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-4 text-surface-500">
          Connect Google Analytics to see this section.
        </section>
        <DashboardWidgetTopPages v-else :site-id="siteId" :range="rangePreset" :limit="9" report-mode :show-menu="false" />
      </template>

      <!-- landing-pages -->
      <template v-else-if="sectionId === 'landing-pages'">
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-4 text-surface-500">
          Connect Google Analytics to see this section.
        </section>
        <DashboardWidgetLandingPages
          v-else
          :site-id="siteId"
          :range="rangePreset"
          :limit="9"
          report-mode
          :show-menu="false"
        />
      </template>

      <!-- top-events -->
      <template v-else-if="sectionId === 'top-events'">
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-4 text-surface-500">
          Connect Google Analytics to see this section.
        </section>
        <DashboardWidgetEvents v-else :site-id="siteId" :range="rangePreset" :limit="10" report-mode :show-menu="false" />
      </template>

      <!-- ecommerce -->
      <template v-else-if="sectionId === 'ecommerce'">
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-4 text-surface-500">
          Connect Google Analytics to see this section.
        </section>
        <DashboardWidgetEcommerce v-else :site-id="siteId" :range="rangePreset" report-mode :show-menu="false" />
      </template>

      <!-- google-ads -->
      <template v-else-if="sectionId === 'google-ads'">
        <section v-if="!hasAds" class="rounded-lg border border-surface-200 bg-surface-50 p-4 text-surface-500">
          Connect Google Ads for this site to see this section.
        </section>
        <GoogleAdsSummaryWidget v-else :site-id="siteId" :kpi-visibility="module.settings.googleAdsKpis" />
      </template>

      <!-- woocommerce -->
      <template v-else-if="sectionId === 'woocommerce'">
        <p v-if="!woocommerceEnabled" class="text-surface-500">WooCommerce reporting is disabled for this workspace.</p>
        <template v-else>
          <section v-if="!wooConfigured" class="rounded-lg border border-surface-200 bg-surface-50 p-4 text-surface-500">
            Configure WooCommerce for this site to see this section.
          </section>
          <template v-else>
            <div v-if="wooLoading" class="rounded-lg border border-surface-200 p-4 text-center text-surface-500">Loading…</div>
            <template v-else-if="wooReport">
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="rounded-lg border border-surface-200 bg-white p-4 shadow-sm">
                  <p class="text-xs font-medium text-surface-500">Total revenue</p>
                  <p class="mt-1 text-lg font-semibold text-surface-900">{{ formatCurrency(wooReport.totalRevenue) }}</p>
                  <p class="mt-0.5 text-xs text-surface-500">{{ wooReport.startDate }} – {{ wooReport.endDate }}</p>
                </div>
                <div class="rounded-lg border border-surface-200 bg-white p-4 shadow-sm">
                  <p class="text-xs font-medium text-surface-500">Orders</p>
                  <p class="mt-1 text-lg font-semibold text-surface-900">{{ wooReport.totalOrders.toLocaleString() }}</p>
                </div>
              </div>
              <div v-if="wooReport.topProducts?.length" class="mt-4 overflow-hidden rounded-lg border border-surface-200 bg-white">
                <p class="border-b border-surface-100 bg-surface-50 px-3 py-2 text-xs font-semibold text-surface-900">
                  Top products by revenue
                </p>
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-surface-200 text-xs">
                    <thead class="bg-surface-50">
                      <tr>
                        <th class="px-3 py-2 text-left font-medium text-surface-600">Product</th>
                        <th class="px-3 py-2 text-right font-medium text-surface-600">Revenue</th>
                        <th class="px-3 py-2 text-right font-medium text-surface-600">Units</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-surface-200">
                      <tr v-for="row in wooReport.topProducts" :key="row.id">
                        <td class="px-3 py-2 font-medium text-surface-900">{{ row.name }}</td>
                        <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(row.revenue) }}</td>
                        <td class="px-3 py-2 text-right tabular-nums">{{ row.quantity.toLocaleString() }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </template>
            <p v-else class="rounded-lg border border-surface-200 p-4 text-surface-500">No sales data for the period.</p>
          </template>
        </template>
      </template>

      <!-- lighthouse -->
      <template v-else-if="sectionId === 'lighthouse'">
        <section
          v-if="!lighthouseMobile && !lighthouseDesktop"
          class="rounded-lg border border-surface-200 bg-surface-50 p-4 text-surface-500"
        >
          Run Lighthouse from the site’s Lighthouse page for mobile and desktop to see scores here.
        </section>
        <div v-else class="grid gap-4 sm:grid-cols-2">
          <div class="rounded-lg border border-surface-200 bg-white p-3">
            <h3 class="mb-2 text-xs font-semibold text-surface-800">Mobile</h3>
            <div v-if="!lighthouseMobile" class="text-xs text-surface-500">No mobile Lighthouse run yet.</div>
            <div v-else class="grid grid-cols-2 gap-2">
              <div
                v-for="cat in lighthouseCategoriesFrom(lighthouseMobile)"
                :key="'lh-m-' + cat.id"
                class="lighthouse-score-tile rounded-lg border border-slate-200 bg-slate-50 p-3 text-center"
              >
                <p class="lighthouse-score-tile__label text-[10px] font-semibold uppercase tracking-wide text-slate-500">{{ cat.title }}</p>
                <p class="lighthouse-score-tile__value mt-1 text-2xl font-bold leading-none" :class="lighthouseScoreClass(cat.score)">
                  {{ cat.score != null ? Math.round(cat.score * 100) : '—' }}
                </p>
              </div>
            </div>
          </div>
          <div class="rounded-lg border border-surface-200 bg-white p-3">
            <h3 class="mb-2 text-xs font-semibold text-surface-800">Desktop</h3>
            <div v-if="!lighthouseDesktop" class="text-xs text-surface-500">No desktop Lighthouse run yet.</div>
            <div v-else class="grid grid-cols-2 gap-2">
              <div
                v-for="cat in lighthouseCategoriesFrom(lighthouseDesktop)"
                :key="'lh-d-' + cat.id"
                class="lighthouse-score-tile rounded-lg border border-slate-200 bg-slate-50 p-3 text-center"
              >
                <p class="lighthouse-score-tile__label text-[10px] font-semibold uppercase tracking-wide text-slate-500">{{ cat.title }}</p>
                <p class="lighthouse-score-tile__value mt-1 text-2xl font-bold leading-none" :class="lighthouseScoreClass(cat.score)">
                  {{ cat.score != null ? Math.round(cat.score * 100) : '—' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- search-console -->
      <template v-else-if="sectionId === 'search-console'">
        <section v-if="!hasGsc" class="rounded-lg border border-surface-200 bg-surface-50 p-4 text-surface-500">
          Connect Google and select a Search Console property to see this section.
        </section>
        <template v-else>
          <div v-if="gscLoading" class="rounded-lg border border-surface-200 p-4 text-center text-surface-500">Loading…</div>
          <div v-else-if="gscSummary" class="grid gap-2 sm:grid-cols-2">
            <div class="rounded-lg border border-surface-200 bg-white p-3 shadow-sm">
              <p class="text-xs font-medium text-surface-500">Clicks</p>
              <p class="mt-0.5 text-lg font-semibold text-surface-900">{{ gscSummary.clicks.toLocaleString() }}</p>
            </div>
            <div class="rounded-lg border border-surface-200 bg-white p-3 shadow-sm">
              <p class="text-xs font-medium text-surface-500">Impressions</p>
              <p class="mt-0.5 text-lg font-semibold text-surface-900">{{ gscSummary.impressions.toLocaleString() }}</p>
            </div>
            <div class="rounded-lg border border-surface-200 bg-white p-3 shadow-sm">
              <p class="text-xs font-medium text-surface-500">CTR</p>
              <p class="mt-0.5 text-lg font-semibold text-surface-900">{{ (gscSummary.ctr * 100).toFixed(2) }}%</p>
            </div>
            <div class="rounded-lg border border-surface-200 bg-white p-3 shadow-sm">
              <p class="text-xs font-medium text-surface-500">Avg position</p>
              <p class="mt-0.5 text-lg font-semibold text-surface-900">{{ gscSummary.position.toFixed(1) }}</p>
            </div>
          </div>
          <p v-else class="rounded-lg border border-surface-200 p-4 text-sm text-surface-500">No Search Console data for the period.</p>
        </template>
      </template>

      <!-- site-audit -->
      <template v-else-if="sectionId === 'site-audit'">
        <section v-if="!auditResult" class="rounded-lg border border-surface-200 bg-surface-50 p-4 text-surface-500">
          Run a Site Audit from the site page to see findings here.
        </section>
        <template v-else>
          <p class="mb-2 text-xs text-surface-700">{{ auditResult.summary }}</p>
          <p class="mb-3 text-[11px] text-surface-500">Audited {{ auditResult.url }} · {{ formatDate(auditResult.fetchedAt) }}</p>
          <div v-if="auditResult.issues.length" class="space-y-2">
            <p class="text-xs font-medium text-surface-700">{{ auditResult.issues.length }} finding(s)</p>
            <div class="flex flex-wrap gap-2">
              <span v-if="auditErrors" class="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800">{{ auditErrors }} error(s)</span>
              <span v-if="auditWarnings" class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">{{ auditWarnings }} warning(s)</span>
              <span v-if="auditInfos" class="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800">{{ auditInfos }} info</span>
            </div>
          </div>
          <p v-else class="text-xs text-surface-500">No issues reported.</p>
        </template>
      </template>

      <!-- rank-tracking -->
      <template v-else-if="sectionId === 'rank-tracking'">
        <div class="rounded-lg border border-surface-200 bg-surface-50 p-4">
          <p v-if="rankKeywordsLoading" class="text-xs text-surface-500">Loading…</p>
          <template v-else>
            <p class="mb-2 text-xs text-surface-700">
              Showing {{ filteredRankKeywords.length }} ranked keyword{{ filteredRankKeywords.length === 1 ? '' : 's' }}
              <template v-if="rankKeywords.length > rankedRankKeywords.length">
                ({{ rankKeywords.length - rankedRankKeywords.length }} without a ranking hidden)
              </template>.
            </p>
            <div v-if="filteredRankKeywords.length" class="overflow-x-auto rounded-lg border border-surface-200 bg-white">
              <table class="min-w-full divide-y divide-surface-200 text-xs">
                <thead class="bg-surface-50">
                  <tr>
                    <th class="px-3 py-2 text-left font-medium text-surface-600">Keyword</th>
                    <th class="px-3 py-2 text-left font-medium text-surface-600">Position</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-200">
                  <tr v-for="kw in filteredRankKeywords" :key="kw.id">
                    <td class="px-3 py-2 font-medium text-surface-900">{{ kw.keyword }}</td>
                    <td class="px-3 py-2">
                      <span class="font-semibold text-primary-600">#{{ kw.last_result_json!.position }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-xs text-surface-500">
              No ranked keywords to show for this report section.
            </p>
          </template>
        </div>
      </template>

      <!-- backlinks -->
      <template v-else-if="sectionId === 'backlinks'">
        <div class="rounded-lg border border-surface-200 bg-surface-50 p-4">
          <BacklinksProfilePanel
            :data="backlinksData"
            :loading="backlinksLoading"
            compact
            empty-hint="No backlink profile yet. Data loads automatically from DataForSEO when credentials and site domain are set."
          />
        </div>
      </template>
    </template>
  </div>
</template>
