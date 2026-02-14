<template>
  <ReportCard
    title="Top events"
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
const props = withDefaults(
  defineProps<{
    siteId: string
    range?: string
    limit?: number
    subtitle?: string
    reportMode?: boolean
    showMenu?: boolean
  }>(),
  { range: 'last_28_days', limit: 10, reportMode: false, showMenu: true }
)
defineEmits<{ (e: 'remove'): void; (e: 'move-up'): void; (e: 'move-down'): void }>()

const { getHeaders } = useReportAuth()
const chartEl = ref<HTMLElement | null>(null)
const loaded = ref(false)
const error = ref('')
let chart: import('echarts').ECharts | null = null

async function load() {
  error.value = ''
  loaded.value = false
  try {
    const res = await $fetch<{ rows: Array<{ eventName: string; eventCount: number; totalUsers: number }> }>('/api/ga4/events', {
      query: { siteId: props.siteId, range: props.range, limit: String(props.limit) },
      headers: getHeaders(),
    })
    const rows = res.rows ?? []
    loaded.value = true
    await nextTick()
    if (chartEl.value && rows.length) {
      const echarts = await import('echarts')
      if (chart) chart.dispose()
      chart = echarts.init(chartEl.value)
      chart.setOption({
        grid: { left: 48, right: 24, top: 16, bottom: 48 },
        xAxis: { type: 'category', data: rows.map((r) => r.eventName), axisLabel: { rotate: 45, fontSize: 9 } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: '#e5e7eb' } } },
        series: [{ type: 'bar', data: rows.map((r) => r.eventCount), itemStyle: { color: '#2563eb' } }],
        tooltip: { trigger: 'axis' },
      })
    }
  } catch (e) {
    error.value = getApiErrorMessage(e)
  }
}

watch([() => props.siteId, () => props.range, () => props.limit], load, { immediate: true })
onUnmounted(() => chart?.dispose())
</script>
