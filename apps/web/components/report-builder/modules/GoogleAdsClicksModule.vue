<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'
import ReportKpiTile from '~/components/report-builder/ReportKpiTile.vue'
import { eachDayInclusive, getCompareDateRange, getDateRangeForPreset } from '~/utils/dateRange'
import {
  REPORT_SUPPORT,
  reportAreaGradientStops,
  reportBrandColors,
  reportCategoryAxis,
  reportChartBase,
  reportLegendBottom,
  reportValueAxis,
} from '~/utils/reportVisualTheme'

defineProps<{
  module: Extract<ReportModule, { type: 'google_ads_clicks' }>
}>()

const { rangePreset, compareToPrevious } = useReportDateRange()

const siteIdRef = inject<Ref<string | null>>('reportBuilderSiteId', ref(null))
const siteId = computed(() => siteIdRef.value)

const { getAdsSummaryTimeseries } = useGoogleIntegration()

const loading = ref(false)
const error = ref('')
const mainRows = ref<Array<{ date: string; clicks: number }>>([])
const compareRows = ref<Array<{ date: string; clicks: number }>>([])
const rangeLabel = ref('')

let chart: import('echarts').ECharts | null = null
const chartEl = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

function seriesForDays(days: string[], rows: Array<{ date: string; clicks: number }>): number[] {
  const map = new Map<string, number>()
  for (const r of rows) {
    const d = r.date.slice(0, 10)
    map.set(d, (map.get(d) ?? 0) + r.clicks)
  }
  return days.map((d) => map.get(d) ?? 0)
}

function formatShort(iso: string) {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return iso.slice(5)
  }
}

function formatRangeTitle(start: string, end: string) {
  try {
    const a = new Date(start + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const b = new Date(end + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    return `${a} – ${b}`
  } catch {
    return `${start} – ${end}`
  }
}

function attachResize(el: HTMLElement) {
  if (typeof ResizeObserver === 'undefined') return
  resizeObserver?.disconnect()
  resizeObserver = new ResizeObserver(() => chart?.resize())
  resizeObserver.observe(el)
}

async function load() {
  if (chart) {
    chart.dispose()
    chart = null
  }
  resizeObserver?.disconnect()
  resizeObserver = null
  error.value = ''
  mainRows.value = []
  compareRows.value = []
  rangeLabel.value = ''
  if (!siteId.value) {
    error.value = 'Select a site to load Google Ads data.'
    return
  }
  loading.value = true
  try {
    const preset = rangePreset.value
    const { startDate, endDate } = getDateRangeForPreset(preset)
    rangeLabel.value = formatRangeTitle(startDate, endDate)
    const main = await getAdsSummaryTimeseries(siteId.value, startDate, endDate)
    mainRows.value = (main.rows ?? []).map((r) => ({ date: r.date, clicks: r.clicks }))

    if (compareToPrevious.value) {
      const cmp = getCompareDateRange(startDate, endDate)
      const prev = await getAdsSummaryTimeseries(siteId.value, cmp.startDate, cmp.endDate)
      compareRows.value = (prev.rows ?? []).map((r) => ({ date: r.date, clicks: r.clicks }))
    } else {
      compareRows.value = []
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? (e instanceof Error ? e.message : String(e)) ?? 'Failed to load Google Ads.'
  } finally {
    loading.value = false
  }
  await nextTick()
  await renderChart()
}

async function renderChart() {
  if (error.value) return
  if (chart) {
    chart.dispose()
    chart = null
  }
  const el = chartEl.value
  if (!el || loading.value) return

  const preset = rangePreset.value
  const { startDate, endDate } = getDateRangeForPreset(preset)
  const mainDays = eachDayInclusive(startDate, endDate)
  const mainSeries = seriesForDays(mainDays, mainRows.value)
  const xLabels = mainDays.map(formatShort)

  let compareSeries: number[] | undefined
  if (compareToPrevious.value && compareRows.value.length) {
    const cmp = getCompareDateRange(startDate, endDate)
    const cmpDays = eachDayInclusive(cmp.startDate, cmp.endDate)
    const n = Math.min(mainDays.length, cmpDays.length)
    compareSeries = seriesForDays(cmpDays.slice(0, n), compareRows.value).slice(0, n)
  }

  const echarts = await import('echarts')
  chart = echarts.init(el)
  attachResize(el)

  const { primary, accent } = reportBrandColors(el)
  const lineColor = accent || primary
  const showLegend = !!(compareSeries?.length && compareToPrevious.value)

  const series: import('echarts').SeriesOption[] = [
    {
      name: 'Clicks',
      type: 'line',
      smooth: 0.35,
      symbolSize: mainDays.length <= 20 ? 5 : 0,
      lineStyle: { width: 2.5, color: lineColor },
      itemStyle: { color: lineColor },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, reportAreaGradientStops(lineColor)),
      },
      data: compareSeries ? mainSeries.slice(0, compareSeries.length) : mainSeries,
    },
  ]

  if (compareSeries?.length) {
    series.push({
      name: 'Prior period',
      type: 'line',
      smooth: 0.35,
      symbolSize: 0,
      lineStyle: { width: 2, type: 'dashed', color: REPORT_SUPPORT.compare },
      itemStyle: { color: REPORT_SUPPORT.compare },
      data: compareSeries,
    })
  }

  const xData = compareSeries?.length ? xLabels.slice(0, compareSeries.length) : xLabels

  chart.setOption({
    ...reportChartBase(),
    color: [lineColor, REPORT_SUPPORT.compare],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      valueFormatter: (v: unknown) => (typeof v === 'number' ? v.toLocaleString() : String(v)),
    },
    legend: showLegend ? reportLegendBottom(['Clicks', 'Prior period']) : undefined,
    grid: {
      left: 44,
      right: 10,
      top: 16,
      bottom: showLegend ? 48 : 24,
      containLabel: false,
    },
    xAxis: {
      ...reportCategoryAxis(xData, { rotate: xData.length > 16 }),
    },
    yAxis: reportValueAxis({ name: 'Clicks', minInterval: 1 }),
    series,
  })
  chart.resize()
}

const totalClicks = computed(() => mainRows.value.reduce((s, r) => s + r.clicks, 0))
const priorClicks = computed(() => compareRows.value.reduce((s, r) => s + r.clicks, 0))
const clicksDelta = computed(() => {
  if (!compareToPrevious.value || !compareRows.value.length) return null
  const prior = priorClicks.value
  const cur = totalClicks.value
  if (prior === 0) return cur === 0 ? 0 : 100
  return Math.round(((cur - prior) / prior) * 1000) / 10
})

onMounted(() => void load())

watch(
  () => [siteId.value, rangePreset.value, compareToPrevious.value] as const,
  () => void load(),
)

watch(loading, async (v) => {
  if (!v) await nextTick(() => renderChart())
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col gap-3">
    <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{{ error }}</div>
    <template v-else>
      <div class="grid grid-cols-2 gap-3 sm:max-w-md">
        <ReportKpiTile
          label="Total clicks"
          :value="loading ? '…' : totalClicks.toLocaleString()"
          :hint="rangeLabel || undefined"
          :delta="clicksDelta"
          tone="primary"
          compact
        />
        <ReportKpiTile
          v-if="compareToPrevious && !loading"
          label="Prior period"
          :value="priorClicks.toLocaleString()"
          hint="comparison window"
          tone="default"
          compact
        />
      </div>
      <div v-if="loading" class="flex flex-1 items-center justify-center rounded-lg border border-dashed border-surface-200 bg-surface-50/50 py-16 text-sm text-surface-500">
        Loading Google Ads…
      </div>
      <div
        v-else
        ref="chartEl"
        class="min-h-[12rem] w-full flex-1 rounded-xl border border-surface-100 bg-white print:min-h-[14rem]"
      />
    </template>
  </div>
</template>
