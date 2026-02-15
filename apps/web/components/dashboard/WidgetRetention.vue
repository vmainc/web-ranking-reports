<template>
  <ReportCard
    title="Retention overview"
    :subtitle="subtitle"
    :report-mode="reportMode"
    :show-menu="showMenu"
    chart-height="280px"
    @remove="$emit('remove')"
    @move-up="$emit('move-up')"
    @move-down="$emit('move-down')"
  >
    <div v-if="error" class="py-4 text-sm text-red-600">{{ error }}</div>
    <div v-else-if="loaded" class="flex flex-col items-center gap-2">
      <div ref="chartEl" class="h-[260px] w-full max-w-sm" />
      <p v-if="total === 0" class="text-sm text-surface-500">No new or returning user data for this period. Try another date range.</p>
    </div>
    <p v-else class="py-4 text-sm text-surface-500">Loading…</p>
  </ReportCard>
</template>

<script setup lang="ts">
import ReportCard from '~/components/report/ReportCard.vue'
import { fmtNum } from '~/utils/format'
import { getApiErrorMessage } from '~/utils/apiError'

const props = withDefaults(
  defineProps<{
    siteId: string
    range?: string
    subtitle?: string
    reportMode?: boolean
    showMenu?: boolean
  }>(),
  { range: 'last_28_days', reportMode: false, showMenu: true }
)
defineEmits<{ (e: 'remove'): void; (e: 'move-up'): void; (e: 'move-down'): void }>()

const { getHeaders } = useReportAuth()
const chartEl = ref<HTMLElement | null>(null)
const data = ref<{ newUsers: number; returningUsers: number }>({ newUsers: 0, returningUsers: 0 })
const loaded = ref(false)
const error = ref('')
let chart: import('echarts').ECharts | null = null

const total = computed(() => data.value.newUsers + data.value.returningUsers)

const pieData = computed(() => {
  if (total.value === 0) return []
  return [
    { name: 'New users', value: data.value.newUsers },
    { name: 'Returning users', value: data.value.returningUsers },
  ]
})

async function load() {
  error.value = ''
  loaded.value = false
  try {
    const res = await $fetch<{ newUsers: number; returningUsers: number }>('/api/ga4/retention', {
      query: { siteId: props.siteId, range: props.range },
      headers: getHeaders(),
    })
    data.value = { newUsers: res.newUsers ?? 0, returningUsers: res.returningUsers ?? 0 }
    loaded.value = true
    await nextTick()
    if (chartEl.value && pieData.value.length) {
      const echarts = await import('echarts')
      if (chart) chart.dispose()
      chart = echarts.init(chartEl.value)
      chart.setOption({
        tooltip: {
          trigger: 'item',
          formatter: (p: { name: string; value: number; percent: number }) =>
            `${p.name}: ${fmtNum(p.value)} (${p.percent.toFixed(1)}%)`,
        },
        legend: { bottom: 0, left: 'center' },
        series: [
          {
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            label: { fontSize: 12 },
            data: pieData.value,
            color: ['#3b82f6', '#10b981'],
          },
        ],
      })
    }
  } catch (e) {
    error.value = getApiErrorMessage(e)
  }
}

watch([() => props.siteId, () => props.range], load, { immediate: true })
onUnmounted(() => chart?.dispose())
</script>
