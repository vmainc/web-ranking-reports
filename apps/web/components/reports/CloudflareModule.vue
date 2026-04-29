<template>
  <div class="space-y-4">
    <div v-if="loading" class="rounded-lg border border-surface-200 bg-surface-50 p-4 text-sm text-surface-500">
      Loading Cloudflare data…
    </div>
    <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ error }}
    </div>
    <div v-else-if="!summary" class="rounded-lg border border-surface-200 bg-surface-50 p-4 text-sm text-surface-500">
      No Data Available
    </div>
    <template v-else>
      <div
        v-if="props.showChart"
        ref="chartEl"
        class="h-44 w-full rounded-xl border border-surface-100 bg-white"
        :class="rowsCount > 1 ? '' : 'hidden'"
      />
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border-2 border-sky-200 bg-sky-50/50 p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-sky-700">Total requests</p>
          <p class="mt-1 text-2xl font-bold text-sky-900">{{ Number(summary.requests || 0).toLocaleString() }}</p>
        </div>
        <div class="rounded-xl border-2 border-primary-200 bg-primary-50/50 p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-primary-700">Bandwidth used</p>
          <p class="mt-1 text-2xl font-bold text-primary-900">{{ formatBytes(summary.bandwidth || 0) }}</p>
        </div>
        <div class="rounded-xl border-2 border-red-200 bg-red-50/50 p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-red-700">Threats blocked</p>
          <p class="mt-1 text-2xl font-bold text-red-900">{{ Number(summary.threats || 0).toLocaleString() }}</p>
        </div>
        <div class="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Cache hit rate</p>
          <p class="mt-1 text-2xl font-bold text-emerald-900">{{ Number(summary.cached_percent || 0).toFixed(1) }}%</p>
        </div>
      </div>
      <p v-if="rowsCount > 0" class="text-xs text-surface-500">Based on {{ rowsCount }} Cloudflare data row(s).</p>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ siteId?: string | null; showChart?: boolean }>(), {
  showChart: true,
})
const pb = usePocketbase()
const loading = ref(false)
const error = ref('')
const summary = ref<{ requests: number; bandwidth: number; threats: number; cached_percent: number } | null>(null)
const rowsCount = ref(0)
const rows = ref<Array<{ date?: string; requests?: number }>>([])
const chartEl = ref<HTMLElement | null>(null)
let chart: import('echarts').ECharts | null = null

function formatShortDate(iso: string): string {
  const day = iso.slice(0, 10)
  try {
    return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return day
  }
}

function buildTrend() {
  const byDate = new Map<string, number>()
  for (const r of rows.value) {
    const d = String(r.date || '').slice(0, 10)
    if (!d) continue
    byDate.set(d, (byDate.get(d) ?? 0) + (Number(r.requests ?? 0) || 0))
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))
}

async function renderTrendChart() {
  if (!props.showChart) return
  if (!chartEl.value) return
  const trend = buildTrend()
  if (trend.length < 2) {
    if (chart) {
      chart.dispose()
      chart = null
    }
    return
  }
  const echarts = await import('echarts')
  if (chart) chart.dispose()
  chart = echarts.init(chartEl.value)
  chart.setOption({
    tooltip: { trigger: 'axis', valueFormatter: (v: unknown) => (typeof v === 'number' ? v.toLocaleString() : String(v)) },
    grid: { left: 42, right: 12, top: 18, bottom: 28 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trend.map(([d]) => formatShortDate(d)),
      axisLabel: { fontSize: 10, color: '#64748b' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value',
      name: 'Requests',
      nameTextStyle: { fontSize: 11, color: '#64748b' },
      axisLabel: { fontSize: 10, color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
    },
    series: [
      {
        name: 'Requests',
        type: 'line',
        smooth: 0.35,
        symbolSize: 4,
        lineStyle: { width: 2.5, color: '#0284c7' },
        itemStyle: { color: '#0284c7' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(2,132,199,0.2)' },
            { offset: 1, color: 'rgba(2,132,199,0.03)' },
          ]),
        },
        data: trend.map(([, v]) => v),
      },
    ],
  })
}

function authHeaders() {
  const token = pb.authStore.token
  if (!token) return undefined
  return { Authorization: `Bearer ${token}` }
}

function formatBytes(bytes: number): string {
  const n = Number(bytes || 0)
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

async function load() {
  loading.value = true
  error.value = ''
  summary.value = null
  rowsCount.value = 0
  rows.value = []
  try {
    const data = await $fetch<{ summary?: { requests: number; bandwidth: number; threats: number; cached_percent: number } | null; rows?: Array<{ date?: string; requests?: number }>; message?: string }>('/api/cloudflare/summary', {
      query: props.siteId ? { siteId: props.siteId } : {},
      headers: authHeaders(),
    })
    summary.value = data.summary ?? null
    rowsCount.value = Array.isArray(data.rows) ? data.rows.length : 0
    rows.value = Array.isArray(data.rows) ? data.rows : []
    if (data.message && rowsCount.value === 0) {
      error.value = data.message
      summary.value = null
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'No Data Available'
  } finally {
    loading.value = false
  }
  await nextTick()
  await renderTrendChart()
}

onMounted(() => void load())
watch(() => props.siteId, () => void load())
onUnmounted(() => {
  if (chart) {
    chart.dispose()
    chart = null
  }
})
</script>

