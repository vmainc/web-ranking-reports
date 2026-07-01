<script setup lang="ts">
import { gbpRowImpressions } from '~/utils/gbpInsightsDisplay'

const props = defineProps<{
  rows: Array<Record<string, number | string>>
}>()

const sortedRows = computed(() =>
  [...props.rows].sort((a, b) => String(a.date).localeCompare(String(b.date))),
)

const impressionsChartEl = ref<HTMLElement | null>(null)
const actionsChartEl = ref<HTMLElement | null>(null)
let impressionsChart: import('echarts').ECharts | null = null
let actionsChart: import('echarts').ECharts | null = null
let resizeObserver: ResizeObserver | null = null

function formatShort(dateStr: string) {
  const d = String(dateStr)
  if (d.length >= 10) {
    try {
      return new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch {
      return d.slice(5, 10)
    }
  }
  return d
}

function attachResize() {
  if (typeof ResizeObserver === 'undefined') return
  resizeObserver?.disconnect()
  resizeObserver = new ResizeObserver(() => {
    impressionsChart?.resize()
    actionsChart?.resize()
  })
  if (impressionsChartEl.value) resizeObserver.observe(impressionsChartEl.value)
  if (actionsChartEl.value) resizeObserver.observe(actionsChartEl.value)
}

function disposeCharts() {
  impressionsChart?.dispose()
  actionsChart?.dispose()
  impressionsChart = null
  actionsChart = null
}

async function renderCharts() {
  disposeCharts()
  const rows = sortedRows.value
  if (!rows.length || !impressionsChartEl.value || !actionsChartEl.value) return

  const dates = rows.map((r) => formatShort(String(r.date)))
  const impressionData = rows.map((r) => gbpRowImpressions(r))
  const callsData = rows.map((r) => Number(r.CALL_CLICKS ?? 0))
  const websiteData = rows.map((r) => Number(r.WEBSITE_CLICKS ?? 0))
  const directionsData = rows.map((r) => Number(r.BUSINESS_DIRECTION_REQUESTS ?? 0))
  const rotateLabels = dates.length > 14

  const echarts = await import('echarts')
  impressionsChart = echarts.init(impressionsChartEl.value)
  actionsChart = echarts.init(actionsChartEl.value)
  attachResize()

  const axisLabel = { fontSize: 10, color: '#64748b', rotate: rotateLabels ? 32 : 0 }
  const grid = { left: 44, right: 12, top: 20, bottom: 28, containLabel: false }
  const yAxis = {
    type: 'value' as const,
    splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' as const } },
    axisLabel: { fontSize: 10, color: '#64748b' },
    minInterval: 1,
  }

  impressionsChart.setOption({
    color: ['#0369a1'],
    textStyle: { fontFamily: 'inherit' },
    tooltip: { trigger: 'axis', valueFormatter: (v: unknown) => (typeof v === 'number' ? v.toLocaleString() : String(v)) },
    grid,
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: { ...yAxis, name: 'Impressions', nameTextStyle: { fontSize: 11, color: '#64748b' } },
    series: [
      {
        name: 'Impressions',
        type: 'line',
        smooth: 0.35,
        symbolSize: dates.length <= 20 ? 4 : 0,
        lineStyle: { width: 2.5, color: '#0369a1' },
        itemStyle: { color: '#0369a1' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(3, 105, 161, 0.2)' },
            { offset: 1, color: 'rgba(3, 105, 161, 0.02)' },
          ]),
        },
        data: impressionData,
      },
    ],
  })

  actionsChart.setOption({
    color: ['#059669', '#7c3aed', '#d97706'],
    textStyle: { fontFamily: 'inherit' },
    tooltip: { trigger: 'axis', valueFormatter: (v: unknown) => (typeof v === 'number' ? v.toLocaleString() : String(v)) },
    legend: { data: ['Calls', 'Website', 'Directions'], bottom: 0, textStyle: { fontSize: 10 } },
    grid: { ...grid, bottom: 40 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: { ...yAxis, name: 'Actions', nameTextStyle: { fontSize: 11, color: '#64748b' } },
    series: [
      { name: 'Calls', type: 'line', smooth: 0.35, symbolSize: 0, data: callsData },
      { name: 'Website', type: 'line', smooth: 0.35, symbolSize: 0, data: websiteData },
      { name: 'Directions', type: 'line', smooth: 0.35, symbolSize: 0, data: directionsData },
    ],
  })

  impressionsChart.resize()
  actionsChart.resize()
}

watch(sortedRows, async () => {
  await nextTick()
  await renderCharts()
})

onMounted(async () => {
  await nextTick()
  await renderCharts()
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  disposeCharts()
})
</script>

<template>
  <div class="mt-4 space-y-4">
    <div class="rounded-lg border border-surface-200 bg-white p-3">
      <p class="mb-2 text-xs font-medium text-surface-600">Impressions over time</p>
      <div ref="impressionsChartEl" class="h-[200px] w-full print:min-h-[200px]" />
    </div>
    <div class="rounded-lg border border-surface-200 bg-white p-3">
      <p class="mb-2 text-xs font-medium text-surface-600">Actions over time</p>
      <div ref="actionsChartEl" class="h-[200px] w-full print:min-h-[200px]" />
    </div>
  </div>
</template>
