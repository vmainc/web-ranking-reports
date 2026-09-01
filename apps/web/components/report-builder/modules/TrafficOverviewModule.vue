<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'
import ReportKpiTile from '~/components/report-builder/ReportKpiTile.vue'
import { getApiErrorMessage } from '~/utils/apiError'
import { fmtDuration, fmtNum } from '~/utils/format'
import {
  eachDayInclusive,
  getCompareDateRange,
  getDateRangeForPreset,
  sessionsSeriesForDays,
} from '~/utils/dateRange'
import {
  REPORT_SUPPORT,
  reportAreaGradientStops,
  reportBrandColors,
  reportCategoryAxis,
  reportChartBase,
  reportLegendBottom,
  reportValueAxis,
} from '~/utils/reportVisualTheme'

const props = defineProps<{
  module: Extract<ReportModule, { type: 'traffic_overview' }>
}>()

const { rangePreset, compareToPrevious } = useReportDateRange()

const siteIdRef = inject<Ref<string | null>>('reportBuilderSiteId', ref(null))
const siteId = computed(() => siteIdRef.value)
const { getHeaders } = useReportAuth()

type ReportSummary = {
  activeUsers: number
  sessions: number
  screenPageViews: number
  engagedSessions: number
  engagementRate: number
  averageSessionDuration: number
}

const loading = ref(false)
const error = ref('')
const rangeLabel = ref('')
const summary = ref<{
  sessions: number
  users: number
  avgDuration: number
  sessionDelta: number | null
  userDelta: number | null
  durationDelta: number | null
} | null>(null)
const mainRows = ref<Array<{ date: string; sessions: number }>>([])
const compareRows = ref<Array<{ date: string; sessions: number }>>([])

let chart: import('echarts').ECharts | null = null
const chartEl = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const emptySummary = (): ReportSummary => ({
  activeUsers: 0,
  sessions: 0,
  screenPageViews: 0,
  engagedSessions: 0,
  engagementRate: 0,
  averageSessionDuration: 0,
})

function pctDelta(a: number, b: number): number {
  return b === 0 ? (a === 0 ? 0 : 100) : Math.round(((a - b) / b) * 1000) / 10
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
    const b = new Date(end + 'T12:00:00').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
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

async function fetchReport(startDate: string, endDate: string) {
  return await $fetch<{
    rows: Array<{ date: string; sessions: number }>
    summary: ReportSummary | null
  }>('/api/google/analytics/report', {
    query: { siteId: siteId.value!, startDate, endDate },
    headers: getHeaders(),
  })
}

async function load() {
  if (chart) {
    chart.dispose()
    chart = null
  }
  resizeObserver?.disconnect()
  resizeObserver = null
  error.value = ''
  summary.value = null
  mainRows.value = []
  compareRows.value = []
  rangeLabel.value = ''

  if (!siteId.value) {
    error.value = 'Link this report to a site to load Google Analytics traffic.'
    return
  }

  loading.value = true
  try {
    const preset = rangePreset.value
    const { startDate, endDate } = getDateRangeForPreset(preset)
    rangeLabel.value = formatRangeTitle(startDate, endDate)

    const currentRes = await fetchReport(startDate, endDate)
    const cur = { ...emptySummary(), ...currentRes.summary }
    mainRows.value = (currentRes.rows ?? []).map((r) => ({ date: r.date, sessions: r.sessions }))

    let prev = emptySummary()
    let sessionDelta: number | null = null
    let userDelta: number | null = null
    let durationDelta: number | null = null

    if (compareToPrevious.value) {
      const cmp = getCompareDateRange(startDate, endDate)
      const prevRes = await fetchReport(cmp.startDate, cmp.endDate)
      compareRows.value = (prevRes.rows ?? []).map((r) => ({ date: r.date, sessions: r.sessions }))
      prev = { ...emptySummary(), ...prevRes.summary }
      sessionDelta = pctDelta(cur.sessions, prev.sessions)
      userDelta = pctDelta(cur.activeUsers, prev.activeUsers)
      durationDelta = pctDelta(cur.averageSessionDuration, prev.averageSessionDuration)
    } else {
      compareRows.value = []
    }

    summary.value = {
      sessions: cur.sessions,
      users: cur.activeUsers,
      avgDuration: cur.averageSessionDuration,
      sessionDelta,
      userDelta,
      durationDelta,
    }
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e)
  } finally {
    loading.value = false
  }
  await nextTick()
  await renderChart()
}

async function renderChart() {
  if (error.value || !props.module.settings.showChart) return
  if (chart) {
    chart.dispose()
    chart = null
  }
  const el = chartEl.value
  if (!el || loading.value) return

  const preset = rangePreset.value
  const { startDate, endDate } = getDateRangeForPreset(preset)
  const mainDays = eachDayInclusive(startDate, endDate)
  const mainSeries = sessionsSeriesForDays(mainDays, mainRows.value)
  const xLabels = mainDays.map(formatShort)

  let compareSeries: number[] | undefined
  if (compareToPrevious.value && compareRows.value.length) {
    const cmp = getCompareDateRange(startDate, endDate)
    const cmpDays = eachDayInclusive(cmp.startDate, cmp.endDate)
    const n = Math.min(mainDays.length, cmpDays.length)
    compareSeries = sessionsSeriesForDays(cmpDays.slice(0, n), compareRows.value).slice(0, n)
  }

  const echarts = await import('echarts')
  chart = echarts.init(el)
  attachResize(el)

  const { primary } = reportBrandColors(el)
  const showLegend = !!(compareSeries?.length && compareToPrevious.value)
  const xData = compareSeries?.length ? xLabels.slice(0, compareSeries.length) : xLabels

  const series: import('echarts').SeriesOption[] = [
    {
      name: 'Sessions',
      type: 'line',
      smooth: 0.35,
      symbolSize: mainDays.length <= 20 ? 5 : 0,
      lineStyle: { width: 2.5, color: primary },
      itemStyle: { color: primary },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, reportAreaGradientStops(primary)),
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

  chart.setOption({
    ...reportChartBase(),
    color: [primary, REPORT_SUPPORT.compare],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      valueFormatter: (v: unknown) => (typeof v === 'number' ? v.toLocaleString() : String(v)),
    },
    legend: showLegend ? reportLegendBottom(['Sessions', 'Prior period']) : undefined,
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
    yAxis: reportValueAxis({ name: 'Sessions', minInterval: 1 }),
    series,
  })
  chart.resize()
}

onMounted(() => void load())

watch(
  () =>
    [
      siteId.value,
      rangePreset.value,
      compareToPrevious.value,
      props.module.settings.showChart,
    ] as const,
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
  <div class="space-y-4">
    <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {{ error }}
    </div>
    <template v-else>
      <div v-if="loading" class="py-6 text-center text-sm text-surface-500">Loading Google Analytics…</div>
      <template v-else-if="summary">
        <div class="grid grid-cols-3 gap-3 sm:grid-cols-4">
          <ReportKpiTile
            label="Sessions"
            :value="fmtNum(summary.sessions)"
            :delta="summary.sessionDelta"
            tone="primary"
          />
          <ReportKpiTile
            label="Users"
            :value="fmtNum(summary.users)"
            :delta="summary.userDelta"
            tone="cyan"
          />
          <ReportKpiTile
            label="Engagement"
            :value="fmtDuration(summary.avgDuration)"
            hint="avg session"
            :delta="summary.durationDelta"
            tone="purple"
          />
        </div>
        <div v-if="module.settings.showChart" class="space-y-1">
          <p v-if="rangeLabel" class="text-xs font-medium text-surface-500">{{ rangeLabel }}</p>
          <div
            ref="chartEl"
            class="min-h-[12rem] w-full rounded-xl border border-surface-100 bg-white print:min-h-[14rem]"
          />
        </div>
        <p v-if="module.settings.showTotals" class="text-xs leading-relaxed text-surface-600">
          Totals reflect the selected range
          <template v-if="compareToPrevious">with period-over-period comparison enabled.</template>
          <template v-else>without comparison.</template>
        </p>
      </template>
    </template>
  </div>
</template>
