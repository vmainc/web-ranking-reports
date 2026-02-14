<template>
  <ReportCard
    title="Sessions trend"
    :subtitle="subtitle"
    :report-mode="reportMode"
    :show-menu="showMenu"
    chart-height="280px"
    @remove="$emit('remove')"
    @move-up="$emit('move-up')"
    @move-down="$emit('move-down')"
  >
    <div v-if="error" class="py-4 text-sm text-red-600">{{ error }}</div>
    <div v-else-if="loaded" ref="chartEl" class="h-[280px] w-full" />
    <p v-else class="py-4 text-sm text-surface-500">Loading…</p>
  </ReportCard>
</template>

<script setup lang="ts">
import ReportCard from '~/components/report/ReportCard.vue'
import { getApiErrorMessage } from '~/utils/apiError'
import { getDateRangeForPreset } from '~/utils/dateRange'
import type { DateRangePreset } from '~/utils/dateRange'

const props = withDefaults(
  defineProps<{
    siteId: string
    range?: string
    compare?: string
    subtitle?: string
    reportMode?: boolean
    showMenu?: boolean
  }>(),
  { range: 'last_28_days', compare: 'previous_period', reportMode: false, showMenu: true }
)
defineEmits<{ (e: 'remove'): void; (e: 'move-up'): void; (e: 'move-down'): void }>()

const { getHeaders } = useReportAuth()
const chartEl = ref<HTMLElement | null>(null)
const loaded = ref(false)
const error = ref('')
let chart: import('echarts').ECharts | null = null

/** Use same report API as Analytics page so dashboard and report share one data source. */
async function load() {
  error.value = ''
  loaded.value = false
  try {
    const preset = (props.range || 'last_28_days') as DateRangePreset
    const { startDate, endDate } = getDateRangeForPreset(preset)
    const res = await $fetch<{ rows: Array<{ date: string; sessions: number }> }>('/api/google/analytics/report', {
      query: { siteId: props.siteId, startDate, endDate },
      headers: getHeaders(),
    })
    const rows = res.rows ?? []
    const dates = rows.map((r) => {
      const d = r.date
      if (d.length === 8) return `${d.slice(4, 6)}/${d.slice(6, 8)}`
      return d
    })
    const values = rows.map((r) => r.sessions)
    loaded.value = true
    await nextTick()
    if (!chartEl.value) return
    const echarts = await import('echarts')
    if (chart) chart.dispose()
    chart = echarts.init(chartEl.value)
    chart.setOption({
      grid: { left: 48, right: 24, top: 24, bottom: 32 },
      xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#e5e7eb' } } },
      series: [
        { type: 'line', data: values, smooth: true, symbol: 'none', lineStyle: { width: 2 }, itemStyle: { color: '#2563eb' } },
      ],
      tooltip: { trigger: 'axis' },
    })
  } catch (e) {
    error.value = getApiErrorMessage(e)
  }
}

watch([() => props.siteId, () => props.range, () => props.compare], load, { immediate: true })
onUnmounted(() => {
  chart?.dispose()
})
</script>
