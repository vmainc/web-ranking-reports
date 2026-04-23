<script setup lang="ts">
import type { SiteRecord } from '~/types'
import type { Report } from '~/types'
import type { ReportBuilderModel } from '~/types/reportBuilder'
import ReportModuleCard from '~/components/report-builder/ReportModuleCard.vue'
import { builderModelFromReport, getReportById } from '~/services/reportBuilderService'
import { resolveSiteLogoUrl } from '~/utils/siteLogoUrl'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const reportId = computed(() => String(route.params.id || ''))

const { getHeaders } = useReportAuth()
const pb = usePocketbase()

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

/** Site’s uploaded logo (same file as Site settings) for PDF footers. */
const siteFooterLogoUrl = computed(() => resolveSiteLogoUrl(site.value, pb))

const reportStyleVars = computed(() => ({
  '--report-primary': model.value?.theme.primaryColor || '#2563eb',
}))

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
    const report = (await getReportById(rid, getHeaders())) as Report & {
      expand?: { site?: SiteRecord }
      payload_json?: Record<string, unknown>
    }
    site.value = report.expand?.site ?? null
    model.value = builderModelFromReport(report)
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
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col bg-surface-100/80" :style="reportStyleVars">
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

    <main v-else class="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 print:px-8 print:py-6">
      <div
        class="report-preview-page rounded-2xl border border-surface-200 bg-white px-6 py-8 shadow-sm print:rounded-none print:border-0 print:shadow-none print:px-0"
      >
        <div v-if="!hasAnyModule" class="rounded-xl border border-dashed border-surface-200 bg-surface-50/50 p-8 text-center text-sm text-surface-600">
          This report has no blocks yet. Open the builder to add modules to a page.
        </div>

        <template v-else>
          <div
            v-for="(page, pageIdx) in sortedPages"
            :key="page.id"
            class="report-pdf-page mb-8 print:mb-0"
            :class="{ 'report-pdf-page--last': pageIdx === sortedPages.length - 1 }"
          >
            <div v-if="sortedPages.length > 1 && page.modules.length" class="mb-3 print:hidden">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-surface-400">{{ page.title }}</p>
            </div>
            <div
              class="report-pdf-page-inner flex min-h-[22rem] max-h-[72vh] flex-col gap-3 overflow-hidden h-[min(42rem,72vh)] sm:h-[min(48rem,76vh)]"
            >
              <div
                v-for="m in [...page.modules].sort((a, b) => a.order - b.order)"
                :key="m.id"
                class="report-pdf-module-wrap flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden"
              >
                <ReportModuleCard :module="m" variant="preview" page-slot :selected="false" />
              </div>
              <footer
                v-if="siteFooterLogoUrl"
                class="report-pdf-page-footer flex shrink-0 items-center justify-center border-t border-surface-200 pt-3 print:border-surface-200 print:pt-2.5"
              >
                <img
                  :src="siteFooterLogoUrl"
                  alt=""
                  class="h-8 max-w-[12rem] object-contain object-center print:h-9"
                  loading="lazy"
                />
              </footer>
            </div>
          </div>
        </template>
      </div>
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
.report-preview-page .report-pdf-module-wrap {
  break-inside: avoid;
  page-break-inside: avoid;
}

@media print {
  .report-preview-page .report-pdf-page-inner {
    height: 252mm;
    max-height: 252mm;
    min-height: 252mm;
  }
}
</style>
