<script setup lang="ts">
import type { SiteRecord } from '~/types'
import type { Report } from '~/types'
import type { ReportBuilderModel } from '~/types/reportBuilder'
import ReportModuleCard from '~/components/report-builder/ReportModuleCard.vue'
import { builderModelFromReport, getReportById } from '~/services/reportBuilderService'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const reportId = computed(() => String(route.params.id || ''))

const { getHeaders } = useReportAuth()

const loading = ref(true)
const pending = ref(true)
const error = ref<string | null>(null)
const model = ref<ReportBuilderModel | null>(null)
const site = ref<SiteRecord | null>(null)

const siteIdRef = computed(() => site.value?.id ?? '')

const reportBuilderSiteId = ref<string | null>(null)
watch(
  () => site.value?.id ?? null,
  (v) => {
    reportBuilderSiteId.value = v
  },
  { immediate: true },
)
provide('reportBuilderSiteId', reportBuilderSiteId)

const modelRef = computed(() => model.value)
provide('reportBuilderModel', modelRef)
provide('reportPreviewSite', site)

const sortedPages = computed(() => {
  const p = model.value?.pages ?? []
  return [...p].sort((a, b) => a.order - b.order)
})

const hasAnyModule = computed(() => sortedPages.value.some((p) => p.modules.length > 0))

/** Small corner mark; hidden if image fails to load. */
const agencyLogoVisible = ref(true)

/** Agency logo endpoint redirects to the stored file (works for PDF capture). */
const agencyLogoSrc = '/api/agency/logo'

const { cssVars: agencyBrandingCss, load: loadAgencyBranding } = useAgencyReportBranding()

const reportStyleVars = computed(() => agencyBrandingCss.value)

async function load() {
  loading.value = true
  pending.value = true
  error.value = null
  model.value = null
  site.value = null
  const rid = reportId.value
  if (!rid) {
    error.value = 'Missing report id'
    loading.value = false
    pending.value = false
    return
  }
  try {
    const [report] = await Promise.all([
      getReportById(rid, getHeaders()) as Promise<
        Report & {
          expand?: { site?: SiteRecord }
          payload_json?: Record<string, unknown>
        }
      >,
      loadAgencyBranding({ headers: getHeaders() }),
    ])
    site.value = report.expand?.site ?? null
    model.value = builderModelFromReport(report)
    agencyLogoVisible.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load report'
  } finally {
    loading.value = false
    pending.value = false
  }
}

watch(reportId, () => void load(), { immediate: true })

useReportPdfReady(toRef(pending), 120_000, {
  pollUntilNoLoading: true,
  rootSelector: '.report-preview-page',
  chartSettleMs: 2600,
})

const { exportPdf, exporting, error: exportError } = useExportPdf(siteIdRef)

function downloadPdf() {
  if (!siteIdRef.value || !reportId.value) return
  void exportPdf('last_28_days', 'previous_period', true, reportId.value)
}

const isPdfCapture = computed(() => typeof route.query.pdf_token === 'string' && !!route.query.pdf_token)
const forceWrrBranding = computed(() => route.query.force_wrr_branding === '1')
</script>

<template>
  <div class="report-pdf-export-root flex min-h-0 flex-1 flex-col bg-white" :style="reportStyleVars">
    <header
      v-if="!isPdfCapture"
      class="shrink-0 border-b border-surface-200 bg-white px-4 py-3 shadow-sm sm:px-6 print:hidden"
    >
      <div class="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
        <NuxtLink
          to="/reports"
          class="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-surface-600 hover:bg-surface-100 hover:text-surface-900"
        >
          <span aria-hidden="true">←</span> Reports
        </NuxtLink>
        <NuxtLink
          v-if="reportId"
          :to="`/reports/${reportId}/builder`"
          class="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Edit in builder
        </NuxtLink>
        <div class="mx-2 hidden h-6 w-px bg-surface-200 sm:block" />
        <div class="min-w-0 flex-1">
          <h1 class="truncate text-base font-semibold text-surface-900">{{ model?.title ?? 'Report preview' }}</h1>
          <p v-if="site" class="truncate text-xs text-surface-500">{{ site.name }} · {{ site.domain }}</p>
        </div>
        <button
          v-if="siteIdRef"
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="exporting || !model"
          @click="downloadPdf()"
        >
          {{ exporting ? 'Preparing PDF…' : 'Download PDF' }}
        </button>
      </div>
      <p v-if="exportError" class="mx-auto mt-2 max-w-4xl text-xs text-red-600">{{ exportError }}</p>
    </header>

    <div v-if="loading" class="flex flex-1 items-center justify-center py-24 text-sm text-surface-500">Loading preview…</div>

    <div v-else-if="error || !model" class="flex flex-1 flex-col items-center justify-center gap-2 py-24 text-center">
      <p class="text-sm font-medium text-surface-800">{{ error || 'Could not load this report.' }}</p>
      <NuxtLink to="/reports" class="text-sm font-semibold text-primary-600 hover:underline">Back to reports</NuxtLink>
    </div>

    <main v-else class="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 print:px-8 print:py-4">
      <div
        class="report-preview-page rounded-2xl border border-surface-200 bg-white px-6 py-8 shadow-sm print:rounded-none print:border-0 print:bg-transparent print:shadow-none print:px-0 print:py-0"
      >
        <div v-if="!hasAnyModule" class="rounded-xl border border-dashed border-surface-200 bg-surface-50/50 p-8 text-center text-sm text-surface-600">
          This report has no blocks yet. Open the builder to add modules to a page.
        </div>

        <template v-else>
          <div
            v-for="(page, pageIdx) in sortedPages"
            :key="page.id"
            class="report-pdf-page mb-8 print:mb-0"
            :class="{
              'report-pdf-page--last': pageIdx === sortedPages.length - 1,
              'report-pdf-page--first': pageIdx === 0,
              'report-pdf-page--subsequent': pageIdx > 0,
            }"
          >
            <div
              class="report-pdf-page-inner relative box-border flex min-h-[42rem] flex-col overflow-hidden sm:min-h-[48rem]"
            >
              <div
                class="report-pdf-page-modules flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pb-10 print:pb-8"
              >
                <div
                  v-for="m in [...page.modules].sort((a, b) => a.order - b.order)"
                  :key="m.id"
                  class="report-pdf-module-wrap flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden"
                >
                  <ReportModuleCard :module="m" variant="preview" page-slot :selected="false" />
                </div>
              </div>
              <div
                v-show="agencyLogoVisible"
                class="report-pdf-agency-mark pointer-events-none absolute bottom-0 right-0 z-20 bg-transparent px-1.5 pt-1 pb-0 print:hidden"
                aria-hidden="true"
              >
                <img
                  :src="agencyLogoSrc"
                  alt=""
                  class="block h-6 max-w-[4.25rem] object-contain object-right object-bottom opacity-90 print:h-7 print:max-w-[5rem]"
                  loading="lazy"
                  @error="agencyLogoVisible = false"
                />
              </div>
              <div
                v-if="forceWrrBranding"
                class="pointer-events-none absolute left-0 top-0 z-30 rounded-br-lg bg-primary-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white"
              >
                WRR
              </div>
            </div>
            <div
              v-if="!isPdfCapture && pageIdx < sortedPages.length - 1"
              class="report-page-break-indicator mb-6 print:hidden"
            >
              <span>Page break</span>
            </div>
          </div>
        </template>
      </div>

      <!-- PDF: fixed footer (Playwright print); outside content flow — not inside .report-preview-page -->
      <div
        v-if="hasAnyModule"
        v-show="agencyLogoVisible"
        class="report-pdf-agency-footer-logo"
        aria-hidden="true"
      >
        <img
          :src="agencyLogoSrc"
          alt=""
          class="report-pdf-agency-footer-logo__img"
          loading="lazy"
          @error="agencyLogoVisible = false"
        />
      </div>
      <div v-if="forceWrrBranding" class="report-pdf-wrr-footer">Powered by Web Ranking Reports</div>
    </main>
  </div>
</template>

<style scoped>
.report-preview-page :deep(.text-primary-600) {
  color: var(--report-primary, #2563eb);
}
.report-preview-page :deep(.bg-primary-600) {
  background-color: var(--report-primary, #2563eb);
}
</style>

<style>
.report-preview-page .report-pdf-page:not(.report-pdf-page--last) {
  break-after: page;
  page-break-after: always;
}
.report-preview-page .report-pdf-page--last {
  break-after: auto;
  page-break-after: auto;
}
.report-preview-page .report-page-break-indicator {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.report-preview-page .report-page-break-indicator::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 1px dashed #cbd5e1;
  transform: translateY(-50%);
}
.report-preview-page .report-page-break-indicator > span {
  position: relative;
  z-index: 1;
  background: #f8fafc;
  padding: 0 0.5rem;
}
.report-preview-page .report-pdf-module-wrap {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* Keep modules top-aligned for a clean, neutral layout. */
.report-pdf-page .report-pdf-page-modules {
  justify-content: flex-start;
  padding-top: 0;
}

/* Screen + non-print: hide fixed footer node (per-page marks handle preview). */
.report-pdf-agency-footer-logo {
  display: none;
}

@media print {
  /* Page canvas behind white modules (logo sits on this, not on a white tile). */
  .report-pdf-export-root {
    background-color: #ffffff !important;
  }

  /* Screen uses a white “sheet” card; in print we want grey page + white module cards only. */
  .report-preview-page {
    background-color: transparent !important;
  }

  /*
   * ~A4 printable height (297mm sheet minus typical browser print margins).
   * Bottom/right inset keeps the fixed agency mark over grey margin, not overlapping the last module.
   */
  .report-preview-page .report-pdf-page-inner {
    height: 272mm;
    max-height: 272mm;
    min-height: 272mm;
    box-sizing: border-box;
    padding-right: 0;
  }
  .report-pdf-page--first .report-pdf-page-inner {
    padding-top: 0;
    padding-bottom: 12mm;
  }
  /* Sheets after the title/cover: top air + symmetric bottom reserve vs footer zone */
  .report-pdf-page--subsequent .report-pdf-page-inner {
    padding-top: 0;
    padding-bottom: 14mm;
  }
  .report-pdf-page .report-pdf-page-modules {
    padding-top: 0;
  }
  /*
   * True PDF-style footer: fixed to the page box, repeated on every printed sheet.
   * Shrink-wrap + transparent so no white box bleeds over the white module cards.
   */
  .report-pdf-agency-footer-logo {
    display: block;
    position: fixed;
    bottom: 25px;
    right: 25px;
    width: auto;
    max-width: 80px;
    height: auto;
    z-index: 9999;
    pointer-events: none;
    line-height: 0;
    background: transparent !important;
    background-color: transparent !important;
    box-shadow: none !important;
    border: none !important;
    padding: 0;
    margin: 0;
  }
  .report-pdf-agency-footer-logo__img {
    display: block;
    width: auto;
    height: auto;
    max-width: 80px;
    max-height: 52px;
    object-fit: contain;
    object-position: right bottom;
    background: transparent !important;
    background-color: transparent !important;
    box-shadow: none !important;
  }
}

.report-pdf-wrr-footer {
  position: fixed;
  right: 14mm;
  bottom: 4mm;
  z-index: 10000;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #334155;
}
</style>
