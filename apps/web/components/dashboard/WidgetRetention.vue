<template>
  <ReportCard
    title="Retention overview"
    :subtitle="subtitle"
    :report-mode="reportMode"
    :show-menu="showMenu"
    chart-height="620px"
    @remove="$emit('remove')"
    @move-up="$emit('move-up')"
    @move-down="$emit('move-down')"
  >
    <div v-if="error" :class="dv ? 'py-4 text-sm text-rose-400' : 'py-4 text-sm text-red-600'">{{ error }}</div>
    <div v-else-if="loaded" class="flex w-full flex-col gap-5">
      <div v-if="total > 0" class="flex justify-center">
        <div ref="chartEl" class="h-[240px] w-full max-w-sm" />
      </div>
      <p v-else :class="dv ? 'text-center text-sm text-slate-500' : 'text-center text-sm text-surface-500'">No new or returning user data for this period. Try another date range.</p>

      <div v-if="retentionCurve?.length" class="w-full">
        <p :class="dv ? 'mb-1 text-xs font-semibold uppercase tracking-wide text-purple-400' : 'mb-1 text-xs font-semibold uppercase tracking-wide text-surface-500'">Retention curve</p>
        <p :class="dv ? 'mb-2 text-xs text-slate-500' : 'mb-2 text-xs text-surface-500'">
          Share of the acquisition-week cohort still active each week after first session—spot where drop-off accelerates.
        </p>
        <div ref="retentionLineEl" class="h-[220px] w-full max-w-2xl" />
      </div>

      <div
        v-if="total > 0 && (returningAvgEngagementSeconds != null || newAvgEngagementSeconds != null)"
        class="w-full max-w-2xl rounded-lg border border-surface-200 bg-surface-50/80 px-4 py-3 text-left text-sm text-surface-700"
      >
        <p class="text-xs font-semibold uppercase tracking-wide text-surface-500">User engagement</p>
        <p class="mt-2 leading-relaxed">
          <span v-if="returningAvgEngagementSeconds != null">
            Returning users average
            <strong class="text-surface-900">{{ fmtDuration(returningAvgEngagementSeconds) }}</strong>
            engaged time per user
          </span>
          <span v-if="newAvgEngagementSeconds != null && returningAvgEngagementSeconds != null"> · </span>
          <span v-if="newAvgEngagementSeconds != null">
            new users average
            <strong class="text-surface-900">{{ fmtDuration(newAvgEngagementSeconds) }}</strong>
          </span>
          <span v-if="engagementInsight"> — {{ engagementInsight }}</span>
        </p>
      </div>

      <div v-if="cohortLtv && retentionCurve?.length" class="w-full overflow-hidden rounded-lg border border-surface-200">
        <p class="border-b border-surface-100 bg-surface-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-surface-600">
          Cohort performance (LTV-style)
        </p>
        <p class="px-3 py-2 text-xs text-surface-500">
          Revenue and key events summed across follow-up weeks for users acquired in the cohort week; per-user figures use
          cohort size at week&nbsp;0.
        </p>
        <div class="grid gap-2 border-b border-surface-100 px-3 py-2 sm:grid-cols-3">
          <div>
            <p class="text-[11px] font-medium uppercase text-surface-500">Cohort users</p>
            <p class="text-lg font-semibold text-surface-900">{{ fmtNum(cohortLtv.cohortUsers) }}</p>
          </div>
          <div>
            <p class="text-[11px] font-medium uppercase text-surface-500">Revenue / user</p>
            <p class="text-lg font-semibold text-surface-900">
              {{ cohortLtv.revenuePerUser != null ? fmtCurrency(cohortLtv.revenuePerUser) : '—' }}
            </p>
          </div>
          <div>
            <p class="text-[11px] font-medium uppercase text-surface-500">Key events / user</p>
            <p class="text-lg font-semibold text-surface-900">
              {{ cohortLtv.keyEventsPerUser != null ? cohortLtv.keyEventsPerUser.toFixed(2) : '—' }}
            </p>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-surface-200 text-sm">
            <thead class="bg-surface-50">
              <tr>
                <th class="px-3 py-2 text-left font-medium text-surface-600">Week</th>
                <th class="px-3 py-2 text-right font-medium text-surface-600">Active</th>
                <th class="px-3 py-2 text-right font-medium text-surface-600">Retained</th>
                <th v-if="showRevenueCol" class="px-3 py-2 text-right font-medium text-surface-600">Revenue</th>
                <th v-if="showKeyEventsCol" class="px-3 py-2 text-right font-medium text-surface-600">Key events</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-200">
              <tr v-for="row in retentionCurve" :key="row.weekOffset">
                <td class="px-3 py-2 font-medium text-surface-800">{{ row.weekOffset }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ fmtNum(row.activeUsers) }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ (row.retainedFraction * 100).toFixed(1) }}%</td>
                <td v-if="showRevenueCol" class="px-3 py-2 text-right tabular-nums">{{ fmtCurrency(row.purchaseRevenue) }}</td>
                <td v-if="showKeyEventsCol" class="px-3 py-2 text-right tabular-nums">{{ fmtNum(row.keyEvents) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p v-if="cohortNote" class="text-center text-xs text-surface-500">{{ cohortNote }}</p>
    </div>
    <p v-else :class="dv ? 'py-4 text-sm text-slate-500' : 'py-4 text-sm text-surface-500'">Loading…</p>
  </ReportCard>
</template>

<script setup lang="ts">
import ReportCard from '~/components/report/ReportCard.vue'
import { fmtNum, fmtDuration, fmtCurrency } from '~/utils/format'
import { getApiErrorMessage } from '~/utils/apiError'
import { DV, vibrantChartBase, vibrantCategoryAxis, vibrantValueAxis } from '~/utils/dashboardVibrantEcharts'

type RetentionCurvePoint = {
  weekOffset: number
  activeUsers: number
  totalUsers: number
  retainedFraction: number
  purchaseRevenue: number
  keyEvents: number
}

type CohortLtvSummary = {
  cohortUsers: number
  totalPurchaseRevenue: number
  revenuePerUser: number | null
  totalKeyEvents: number
  keyEventsPerUser: number | null
}

const props = withDefaults(
  defineProps<{
    siteId: string
    range?: string
    startDate?: string
    endDate?: string
    subtitle?: string
    reportMode?: boolean
    showMenu?: boolean
  }>(),
  { range: 'last_28_days', reportMode: false, showMenu: true },
)
defineEmits<{ (e: 'remove'): void; (e: 'move-up'): void; (e: 'move-down'): void }>()

const dv = useDashboardVibrant()
const { getHeaders } = useReportAuth()
const chartEl = ref<HTMLElement | null>(null)
const retentionLineEl = ref<HTMLElement | null>(null)
const data = ref<{
  newUsers: number
  returningUsers: number
  newAvgEngagementSeconds: number | null
  returningAvgEngagementSeconds: number | null
  retentionCurve: RetentionCurvePoint[] | null
  cohortLtv: CohortLtvSummary | null
  cohortNote?: string | null
}>({
  newUsers: 0,
  returningUsers: 0,
  newAvgEngagementSeconds: null,
  returningAvgEngagementSeconds: null,
  retentionCurve: null,
  cohortLtv: null,
  cohortNote: null,
})
const loaded = ref(false)
const error = ref('')
let chart: import('echarts').ECharts | null = null
let lineChart: import('echarts').ECharts | null = null

const total = computed(() => data.value.newUsers + data.value.returningUsers)
const retentionCurve = computed(() => data.value.retentionCurve)
const cohortLtv = computed(() => data.value.cohortLtv)
const cohortNote = computed(() => data.value.cohortNote ?? '')

const showRevenueCol = computed(() => cohortLtv.value?.revenuePerUser != null)
const showKeyEventsCol = computed(() => cohortLtv.value?.keyEventsPerUser != null)

const newAvgEngagementSeconds = computed(() => data.value.newAvgEngagementSeconds)
const returningAvgEngagementSeconds = computed(() => data.value.returningAvgEngagementSeconds)

/** Short comparison when both cohorts have engagement averages. */
const engagementInsight = computed(() => {
  const n = newAvgEngagementSeconds.value
  const r = returningAvgEngagementSeconds.value
  if (n == null || r == null) return ''
  const diff = r - n
  if (Math.abs(diff) < 3) return 'Both groups show similar engagement depth.'
  if (diff > 0) return 'Returning users stay active longer on average—a positive retention signal.'
  return 'New users are slightly more engaged per user this period; watch how that evolves as they return.'
})

const pieData = computed(() => {
  if (total.value === 0) return []
  return [
    { name: 'New users', value: data.value.newUsers },
    { name: 'Returning users', value: data.value.returningUsers },
  ]
})

async function renderPie() {
  if (!chartEl.value || !pieData.value.length) return
  const echarts = await import('echarts')
  if (chart) chart.dispose()
  chart = echarts.init(chartEl.value)
  chart.setOption({
    ...(dv ? vibrantChartBase() : {}),
    tooltip: {
      trigger: 'item',
      formatter: (p: { name: string; value: number; percent: number }) =>
        `${p.name}: ${fmtNum(p.value)} (${p.percent.toFixed(1)}%)`,
    },
    legend: dv
      ? { bottom: 0, left: 'center', textStyle: { color: DV.slate400 } }
      : { bottom: 0, left: 'center' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: { fontSize: 12, color: dv ? '#e2e8f0' : '#334155' },
        data: pieData.value,
        color: [DV.blue, DV.green],
        itemStyle: dv ? { borderColor: '#0f172a', borderWidth: 2 } : undefined,
      },
    ],
  })
}

async function renderRetentionLine() {
  const pts = retentionCurve.value
  if (!retentionLineEl.value || !pts?.length) {
    lineChart?.dispose()
    lineChart = null
    return
  }
  const echarts = await import('echarts')
  if (lineChart) lineChart.dispose()
  lineChart = echarts.init(retentionLineEl.value)
  const labels = pts.map((p) => `Wk ${p.weekOffset}`)
  const pct = pts.map((p) => Math.round(p.retainedFraction * 1000) / 10)
  lineChart.setOption({
    ...(dv ? vibrantChartBase() : {}),
    grid: { left: 44, right: 12, top: 8, bottom: 28 },
    xAxis: dv ? vibrantCategoryAxis(labels) : { type: 'category', data: labels, axisLabel: { fontSize: 10 } },
    yAxis: dv
      ? vibrantValueAxis({ min: 0, max: 100, axisLabelFormatter: '{value}%' })
      : {
          type: 'value',
          min: 0,
          max: 100,
          axisLabel: { formatter: '{value}%', fontSize: 10 },
          splitLine: { lineStyle: { color: '#e5e7eb' } },
        },
    series: [
      {
        type: 'line',
        name: 'Retained',
        data: pct,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5, color: dv ? DV.purple : '#0ea5e9' },
        itemStyle: { color: dv ? DV.purple : '#0ea5e9' },
        areaStyle: dv ? { color: 'rgba(139, 92, 246, 0.12)' } : undefined,
      },
    ],
    tooltip: {
      trigger: 'axis',
      formatter: (items: Array<{ dataIndex: number }>) => {
        const i = items[0]?.dataIndex ?? 0
        const p = pts[i]
        if (!p) return ''
        return `Week ${p.weekOffset}<br/>Retained: ${(p.retainedFraction * 100).toFixed(1)}%<br/>Active: ${fmtNum(p.activeUsers)} / ${fmtNum(p.totalUsers)}`
      },
    },
  })
}

async function load() {
  error.value = ''
  loaded.value = false
  lineChart?.dispose()
  lineChart = null
  chart?.dispose()
  chart = null
  try {
    const res = await $fetch<{
      newUsers: number
      returningUsers: number
      newAvgEngagementSeconds?: number | null
      returningAvgEngagementSeconds?: number | null
      retentionCurve?: RetentionCurvePoint[] | null
      cohortLtv?: CohortLtvSummary | null
      cohortNote?: string | null
    }>('/api/ga4/retention', {
      query: {
        siteId: props.siteId,
        range: props.range,
        ...(props.startDate && props.endDate ? { startDate: props.startDate, endDate: props.endDate } : {}),
      },
      headers: getHeaders(),
    })
    data.value = {
      newUsers: res.newUsers ?? 0,
      returningUsers: res.returningUsers ?? 0,
      newAvgEngagementSeconds: typeof res.newAvgEngagementSeconds === 'number' ? res.newAvgEngagementSeconds : null,
      returningAvgEngagementSeconds:
        typeof res.returningAvgEngagementSeconds === 'number' ? res.returningAvgEngagementSeconds : null,
      retentionCurve: Array.isArray(res.retentionCurve) ? res.retentionCurve : null,
      cohortLtv: res.cohortLtv && typeof res.cohortLtv.cohortUsers === 'number' ? res.cohortLtv : null,
      cohortNote: typeof res.cohortNote === 'string' ? res.cohortNote : null,
    }
    loaded.value = true
    await nextTick()
    await renderPie()
    await nextTick()
    await renderRetentionLine()
  } catch (e) {
    error.value = getApiErrorMessage(e)
  }
}

watch([() => props.siteId, () => props.range, () => props.startDate, () => props.endDate], load, { immediate: true })
onUnmounted(() => {
  chart?.dispose()
  lineChart?.dispose()
})
</script>
