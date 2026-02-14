<template>
  <ReportCard
    title="Traffic channels"
    :subtitle="subtitle"
    :report-mode="reportMode"
    :show-menu="showMenu"
    chart-height="280px"
    @remove="$emit('remove')"
    @move-up="$emit('move-up')"
    @move-down="$emit('move-down')"
  >
    <div v-if="error" class="py-4 text-sm text-red-600">{{ error }}</div>
    <div v-else-if="rows.length" class="grid gap-4 md:grid-cols-2">
      <div ref="chartEl" class="h-[260px] w-full" />
      <SimpleTable
        :columns="[
          { label: 'Channel', field: 'channel' },
          { label: 'Sessions', field: 'sessions', format: (v) => fmtNum(Number(v)) },
          { label: 'Users', field: 'users', format: (v) => fmtNum(Number(v)) },
        ]"
        :rows="rows"
      />
    </div>
    <p v-else-if="loaded" class="py-4 text-sm text-surface-500">No channel data for this period.</p>
    <p v-else class="py-4 text-sm text-surface-500">Loading…</p>
  </ReportCard>
</template>

<script setup lang="ts">
import ReportCard from '~/components/report/ReportCard.vue'
import SimpleTable from '~/components/report/SimpleTable.vue'
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
const rows = ref<Array<{ channel: string; sessions: number; users: number }>>([])
const loaded = ref(false)
const error = ref('')
let chart: import('echarts').ECharts | null = null

async function load() {
  error.value = ''
  loaded.value = false
  try {
    const res = await $fetch<{ rows: Array<{ channel: string; sessions: number; users: number }> }>('/api/ga4/channels', {
      query: { siteId: props.siteId, range: props.range },
      headers: getHeaders(),
    })
    rows.value = res.rows ?? []
    loaded.value = true
    await nextTick()
    if (chartEl.value && rows.value.length) {
      const echarts = await import('echarts')
      if (chart) chart.dispose()
      chart = echarts.init(chartEl.value)
      chart.setOption({
        tooltip: { trigger: 'item' },
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: { fontSize: 10 },
          data: rows.value.map((r) => ({ name: r.channel, value: r.sessions })),
        }],
      })
    }
  } catch (e) {
    error.value = getApiErrorMessage(e)
  }
}

watch([() => props.siteId, () => props.range], load, { immediate: true })
onUnmounted(() => chart?.dispose())
</script>
