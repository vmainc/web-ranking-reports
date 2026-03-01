<template>
  <div class="space-y-6">
    <div v-if="summaryError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{{ summaryError }}</div>
    <template v-else-if="summary">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-xl border-2 border-primary-200 bg-primary-50/50 p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-primary-700">Cost</p>
          <p class="mt-1 text-3xl font-bold text-primary-900">${{ summary.summary.cost.toFixed(2) }}</p>
        </div>
        <div class="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Conversions</p>
          <p class="mt-1 text-3xl font-bold text-emerald-900">{{ summary.summary.conversions.toLocaleString(undefined, { maximumFractionDigits: 1 }) }}</p>
        </div>
        <div class="rounded-xl border-2 border-sky-200 bg-sky-50/50 p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-sky-700">Clicks</p>
          <p class="mt-1 text-3xl font-bold text-sky-900">{{ summary.summary.clicks.toLocaleString() }}</p>
        </div>
        <div class="rounded-xl border-2 border-violet-200 bg-violet-50/50 p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-violet-700">Conv. rate</p>
          <p class="mt-1 text-3xl font-bold text-violet-900">{{ summary.summary.clicks ? ((summary.summary.conversions / summary.summary.clicks) * 100).toFixed(1) : '0' }}%</p>
        </div>
        <div class="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-amber-700">Impressions</p>
          <p class="mt-1 text-3xl font-bold text-amber-900">{{ summary.summary.impressions.toLocaleString() }}</p>
        </div>
        <div class="rounded-xl border-2 border-slate-200 bg-slate-50/50 p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-700">CTR</p>
          <p class="mt-1 text-3xl font-bold text-slate-900">{{ summary.summary.impressions ? ((summary.summary.clicks / summary.summary.impressions) * 100).toFixed(2) : '0' }}%</p>
        </div>
      </div>
      <div class="rounded-xl border border-surface-200 bg-white shadow-sm overflow-hidden">
        <h3 class="border-b border-surface-200 bg-surface-50 px-4 py-3 text-sm font-semibold text-surface-900">Trend ({{ summary.startDate }} – {{ summary.endDate }})</h3>
        <div v-if="timeseriesLoading" class="h-64 flex items-center justify-center text-sm text-surface-500">Loading trend…</div>
        <div v-else-if="timeseriesError" class="px-4 py-6 text-sm text-amber-700">{{ timeseriesError }}</div>
        <div v-else-if="timeseriesRows.length === 0" class="flex h-64 items-center justify-center text-sm text-surface-500">No daily data for this period.</div>
        <div v-else class="p-4">
          <div ref="chartEl" class="h-72 w-full min-h-[18rem]" />
        </div>
      </div>
      <p class="text-sm text-surface-500">
        <NuxtLink :to="`/sites/${siteId}/ads`" class="font-medium text-primary-600 hover:underline">View full Google Ads report →</NuxtLink>
      </p>
    </template>
    <p v-else-if="summaryLoading" class="py-4 text-sm text-surface-500">Loading Google Ads data…</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ siteId: string }>()
const { getAdsSummary, getAdsSummaryTimeseries } = useGoogleIntegration()

const summary = ref<{
  startDate: string
  endDate: string
  summary: { impressions: number; clicks: number; cost: number; conversions: number }
} | null>(null)
const summaryLoading = ref(false)
const summaryError = ref('')
const timeseriesRows = ref<Array<{ date: string; clicks: number; cost: number; conversions: number }>>([])
const timeseriesLoading = ref(false)
const timeseriesError = ref('')
const chartEl = ref<HTMLElement | null>(null)
let chart: import('echarts').ECharts | null = null

function defaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) }
}

async function load() {
  if (!props.siteId) return
  summaryError.value = ''
  summaryLoading.value = true
  summary.value = null
  try {
    const { startDate, endDate } = defaultDateRange()
    summary.value = await getAdsSummary(props.siteId, startDate, endDate)
    loadTimeseries()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    summaryError.value = err?.data?.message ?? (e instanceof Error ? e.message : String(e)) ?? 'Failed to load Google Ads data.'
  } finally {
    summaryLoading.value = false
  }
}

async function loadTimeseries() {
  if (!summary.value) return
  timeseriesError.value = ''
  timeseriesLoading.value = true
  try {
    const data = await getAdsSummaryTimeseries(props.siteId, summary.value.startDate, summary.value.endDate)
    timeseriesRows.value = (data.rows ?? []).map((r) => ({ date: r.date, clicks: r.clicks, cost: r.cost, conversions: r.conversions }))
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    timeseriesError.value = err?.data?.message ?? (e instanceof Error ? e.message : String(e)) ?? 'Failed to load trend.'
    timeseriesRows.value = []
  } finally {
    timeseriesLoading.value = false
  }
  await nextTick()
  renderChart()
}

async function renderChart() {
  const el = chartEl.value
  if (!el || timeseriesRows.value.length === 0) return
  const dates = timeseriesRows.value.map((r) => r.date)
  const clicks = timeseriesRows.value.map((r) => r.clicks)
  const conversions = timeseriesRows.value.map((r) => r.conversions)
  const cost = timeseriesRows.value.map((r) => r.cost)
  const echarts = await import('echarts')
  if (chart) chart.dispose()
  chart = echarts.init(el)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['Cost', 'Clicks', 'Conversions'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: dates },
    yAxis: [
      { type: 'value', name: 'Clicks / Conversions', position: 'left' },
      { type: 'value', name: 'Cost ($)', position: 'right' },
    ],
    series: [
      { name: 'Cost', type: 'line', data: cost, yAxisIndex: 1, smooth: true, itemStyle: { color: '#0f766e' } },
      { name: 'Clicks', type: 'line', data: clicks, smooth: true, itemStyle: { color: '#0369a1' } },
      { name: 'Conversions', type: 'line', data: conversions, smooth: true, itemStyle: { color: '#047857' } },
    ],
  })
}

onMounted(() => load())
watch(() => props.siteId, () => load())
onBeforeUnmount(() => { if (chart) chart.dispose() })
</script>
