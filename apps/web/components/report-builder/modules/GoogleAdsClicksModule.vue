<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'
import { eachDayInclusive, getCompareDateRange, getDateRangeForPreset } from '~/utils/dateRange'

const props = defineProps<{
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

  const showLegend = !!(compareSeries?.length && compareToPrevious.value)

  const series: import('echarts').SeriesOption[] = [
    {
      name: 'Clicks',
      type: 'line',
      smooth: 0.35,
      symbolSize: mainDays.length <= 20 ? 5 : 0,
      lineStyle: { width: 2.5, color: '#0369a1' },
      itemStyle: { color: '#0369a1' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(3, 105, 161, 0.2)' },
          { offset: 1, color: 'rgba(3, 105, 161, 0.02)' },
        ]),
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
      lineStyle: { width: 2, type: 'dashed', color: '#94a3b8' },
      itemStyle: { color: '#94a3b8' },
      data: compareSeries,
    })
  }

  const xData = compareSeries?.length ? xLabels.slice(0, compareSeries.length) : xLabels

  chart.setOption({
    color: ['#0369a1', '#94a3b8'],
    textStyle: { fontFamily: 'inherit' },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      valueFormatter: (v: unknown) => (typeof v === 'number' ? v.toLocaleString() : String(v)),
    },
    legend: showLegend
      ? { data: ['Clicks', 'Prior period'], bottom: 4, textStyle: { fontSize: 11 } }
      : undefined,
    grid: {
      left: 44,
      right: 10,
      top: 16,
      bottom: showLegend ? 48 : 24,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xData,
      axisLabel: { fontSize: 10, color: '#64748b', rotate: xData.length > 16 ? 32 : 0 },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value',
      name: 'Clicks',
      nameTextStyle: { fontSize: 11, color: '#64748b', padding: [0, 0, 0, 4] },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLabel: { fontSize: 10, color: '#64748b' },
      minInterval: 1,
    },
    series,
  })
  chart.resize()
}

const totalClicks = computed(() => mainRows.value.reduce((s, r) => s + r.clicks, 0))

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
  <div class="flex h-full min-h-0 flex-1 flex-col gap-2">
    <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{{ error }}</div>
    <template v-else>
      <div class="flex flex-wrap items-baseline justify-between gap-2 text-xs text-surface-500">
        <span v-if="rangeLabel">{{ rangeLabel }}</span>
        <span v-if="!loading" class="font-semibold text-surface-700">{{ totalClicks.toLocaleString() }} clicks</span>
      </div>
      <div v-if="loading" class="flex flex-1 items-center justify-center rounded-lg border border-dashed border-surface-200 bg-surface-50/50 py-16 text-sm text-surface-500">
        Loading Google Ads…
      </div>
      <div
        v-else
        ref="chartEl"
        class="min-h-[12rem] w-full flex-1 rounded-lg border border-surface-100 bg-white print:min-h-[14rem]"
      />
    </template>
  </div>
</template>
