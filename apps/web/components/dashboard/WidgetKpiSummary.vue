<template>
  <ReportCard
    title="Performance summary"
    :subtitle="subtitle"
    :report-mode="reportMode"
    :show-menu="showMenu"
    chart-height="auto"
    @remove="$emit('remove')"
    @move-up="$emit('move-up')"
    @move-down="$emit('move-down')"
  >
    <div v-if="error" class="py-4 text-sm text-red-600">{{ error }}</div>
    <KpiCardRow
      v-else-if="data"
      :items="kpiItems"
      :show-comparisons="!!(data.current && data.previous)"
    />
    <p v-else class="py-4 text-sm text-surface-500">Loading…</p>
  </ReportCard>
</template>

<script setup lang="ts">
import ReportCard from '~/components/report/ReportCard.vue'
import KpiCardRow from '~/components/report/KpiCardRow.vue'
import { fmtNum, fmtPct, fmtDuration } from '~/utils/format'
import { getApiErrorMessage } from '~/utils/apiError'
import { getDateRangeForPreset, getCompareDateRange } from '~/utils/dateRange'
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
const data = ref<{
  current: Record<string, number>
  previous: Record<string, number>
  deltas: Record<string, number>
} | null>(null)
const error = ref('')

const kpiItems = computed(() => {
  if (!data.value?.current) return []
  const cur = data.value.current
  const del = data.value.deltas ?? {}
  return [
    { label: 'Users', value: cur.users, delta: del.users },
    { label: 'Sessions', value: cur.sessions, delta: del.sessions },
    { label: 'Page views', value: cur.views, delta: del.views },
    { label: 'Engaged sessions', value: cur.engagedSessions, delta: del.engagedSessions },
    { label: 'Engagement rate', value: cur.engagementRate, formatted: fmtPct(cur.engagementRate * 100), delta: del.engagementRate },
    { label: 'Avg. session', value: cur.averageSessionDuration, formatted: fmtDuration(cur.averageSessionDuration), delta: del.averageSessionDuration },
  ]
})

/** Use same report API as Analytics page so dashboard and report share one data source. */
async function load() {
  error.value = ''
  try {
    const preset = (props.range || 'last_28_days') as DateRangePreset
    const { startDate, endDate } = getDateRangeForPreset(preset)
    const headers = getHeaders()

    type ReportSummary = {
      activeUsers: number
      sessions: number
      screenPageViews: number
      engagedSessions: number
      engagementRate: number
      averageSessionDuration: number
    }
    const emptySummary: ReportSummary = {
      activeUsers: 0,
      sessions: 0,
      screenPageViews: 0,
      engagedSessions: 0,
      engagementRate: 0,
      averageSessionDuration: 0,
    }
    const currentRes = await $fetch<{ summary: ReportSummary | null }>(
      '/api/google/analytics/report',
      { query: { siteId: props.siteId, startDate, endDate }, headers }
    )
    const cur: ReportSummary = { ...emptySummary, ...currentRes.summary }

    let prev: ReportSummary = { ...emptySummary }
    if (props.compare && props.compare !== 'none') {
      const comp = getCompareDateRange(startDate, endDate)
      const prevRes = await $fetch<{ summary: ReportSummary | null }>(
        '/api/google/analytics/report',
        { query: { siteId: props.siteId, startDate: comp.startDate, endDate: comp.endDate }, headers }
      )
      prev = { ...emptySummary, ...prevRes.summary }
    }

    const delta = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : 100) : Math.round(((a - b) / b) * 1000) / 10)
    data.value = {
      current: {
        users: cur.activeUsers,
        sessions: cur.sessions,
        views: cur.screenPageViews,
        engagedSessions: cur.engagedSessions,
        engagementRate: cur.engagementRate,
        averageSessionDuration: cur.averageSessionDuration,
      },
      previous: {
        users: prev.activeUsers,
        sessions: prev.sessions,
        views: prev.screenPageViews,
        engagedSessions: prev.engagedSessions,
        engagementRate: prev.engagementRate,
        averageSessionDuration: prev.averageSessionDuration,
      },
      deltas: {
        users: delta(cur.activeUsers, prev.activeUsers),
        sessions: delta(cur.sessions, prev.sessions),
        views: delta(cur.screenPageViews, prev.screenPageViews),
        engagedSessions: delta(cur.engagedSessions, prev.engagedSessions),
        engagementRate: delta(cur.engagementRate, prev.engagementRate),
        averageSessionDuration: delta(cur.averageSessionDuration, prev.averageSessionDuration),
      },
    }
  } catch (e) {
    error.value = getApiErrorMessage(e)
  }
}

watch([() => props.siteId, () => props.range, () => props.compare], load, { immediate: true })
</script>
