<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'
import { getApiErrorMessage } from '~/utils/apiError'
import { fmtDuration, fmtNum } from '~/utils/format'
import {
  eachDayInclusive,
  getCompareDateRange,
  getDateRangeForPreset,
  sessionsSeriesForDays,
} from '~/utils/dateRange'

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

  const showLegend = !!(compareSeries?.length && compareToPrevious.value)
  const xData = compareSeries?.length ? xLabels.slice(0, compareSeries.length) : xLabels

  const series: import('echarts').SeriesOption[] = [
    {
      name: 'Sessions',
      type: 'line',
      smooth: 0.35,
      symbolSize: mainDays.length <= 20 ? 5 : 0,
      lineStyle: { width: 2.5, color: '#2563eb' },
      itemStyle: { color: '#2563eb' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(37, 99, 235, 0.2)' },
          { offset: 1, color: 'rgba(37, 99, 235, 0.02)' },
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

  chart.setOption({
    color: ['#2563eb', '#94a3b8'],
    textStyle: { fontFamily: 'inherit' },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      valueFormatter: (v: unknown) => (typeof v === 'number' ? v.toLocaleString() : String(v)),
    },
    legend: showLegend
      ? { data: ['Sessions', 'Prior period'], bottom: 4, textStyle: { fontSize: 11 } }
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
      name: 'Sessions',
      nameTextStyle: { fontSize: 11, color: '#64748b', padding: [0, 0, 0, 4] },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLabel: { fontSize: 10, color: '#64748b' },
      minInterval: 1,
    },
    series,
  })
  chart.resize()
}

function deltaClass(delta: number | null) {
  if (delta == null) return 'text-surface-500'
  if (delta > 0) return 'text-emerald-600'
  if (delta < 0) return 'text-rose-600'
  return 'text-surface-500'
}

function deltaLabel(delta: number | null) {
  if (delta == null) return ''
  return `${delta > 0 ? '+' : ''}${delta}% vs prior`
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
          <div class="rounded-lg border border-surface-100 bg-white px-3 py-2 shadow-sm">
            <p class="text-[10px] font-medium uppercase tracking-wide text-surface-500">Sessions</p>
            <p class="text-lg font-semibold text-surface-900">{{ fmtNum(summary.sessions) }}</p>
            <p v-if="summary.sessionDelta != null" class="text-xs" :class="deltaClass(summary.sessionDelta)">
              {{ deltaLabel(summary.sessionDelta) }}
            </p>
          </div>
          <div class="rounded-lg border border-surface-100 bg-white px-3 py-2 shadow-sm">
            <p class="text-[10px] font-medium uppercase tracking-wide text-surface-500">Users</p>
            <p class="text-lg font-semibold text-surface-900">{{ fmtNum(summary.users) }}</p>
            <p v-if="summary.userDelta != null" class="text-xs" :class="deltaClass(summary.userDelta)">
              {{ deltaLabel(summary.userDelta) }}
            </p>
          </div>
          <div class="rounded-lg border border-surface-100 bg-white px-3 py-2 shadow-sm">
            <p class="text-[10px] font-medium uppercase tracking-wide text-surface-500">Engagement</p>
            <p class="text-lg font-semibold text-surface-900">{{ fmtDuration(summary.avgDuration) }}</p>
            <p class="text-xs text-surface-500">avg session</p>
            <p
              v-if="summary.durationDelta != null"
              class="text-xs"
              :class="deltaClass(summary.durationDelta)"
            >
              {{ deltaLabel(summary.durationDelta) }}
            </p>
          </div>
        </div>
        <div v-if="module.settings.showChart" class="space-y-1">
          <p v-if="rangeLabel" class="text-xs text-surface-500">{{ rangeLabel }}</p>
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
