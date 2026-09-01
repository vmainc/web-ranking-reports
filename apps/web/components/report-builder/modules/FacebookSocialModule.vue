<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'
import ReportKpiTile from '~/components/report-builder/ReportKpiTile.vue'
import { getDateRangeForPreset } from '~/utils/dateRange'

defineProps<{
  module: Extract<ReportModule, { type: 'facebook_social' }>
}>()

const { rangePreset } = useReportDateRange()
const siteIdRef = inject<Ref<string | null>>('reportBuilderSiteId', ref(null))
const siteId = computed(() => siteIdRef.value)
const pb = usePocketbase()

type MetricView = {
  key: string
  label: string
  value: number | null
  available: boolean
  isExact: boolean
  aggregation?: string
  periodType?: string
  periodLabel?: string
  asOf?: string
  unsupportedReason?: string
}

type Summary = {
  connection: { displayName: string; accessType: string; connectedThroughMeta: boolean } | null
  capabilities: { followers: boolean; reach: boolean; engagement: boolean; posts: boolean }
  publicMetricsUnavailableReason?: string
  metrics: {
    followers: MetricView
    followerGrowth: MetricView
    reach: MetricView
    engagement: MetricView
    postsPublished: MetricView
  }
}

const loading = ref(false)
const error = ref('')
const summary = ref<Summary | null>(null)

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatNum(m: MetricView): string {
  if (!m.available || m.value == null) return '—'
  const n = Math.round(m.value).toLocaleString()
  return m.isExact === false ? `~${n}` : n
}

function growthLabel(m: MetricView): string {
  if (!m.available || m.value == null) return ''
  if (m.value > 0) return `▲ ${m.value.toLocaleString()}`
  if (m.value < 0) return `▼ ${Math.abs(m.value).toLocaleString()}`
  return 'No change'
}

async function load() {
  error.value = ''
  summary.value = null
  if (!siteId.value) {
    error.value = 'Select a site to load Facebook data.'
    return
  }
  loading.value = true
  try {
    const { startDate, endDate } = getDateRangeForPreset(rangePreset.value)
    summary.value = await $fetch<Summary>(`/api/sites/${siteId.value}/social/summary`, {
      headers: authHeaders(),
      query: { start: startDate, end: endDate },
    })
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Could not load Facebook metrics.'
  } finally {
    loading.value = false
  }
}

watch([siteId, rangePreset], () => {
  void load()
}, { immediate: true })
</script>

<template>
  <div class="space-y-3">
    <p v-if="loading" class="text-sm text-surface-500">Loading…</p>
    <p v-else-if="error" class="text-sm text-red-700">{{ error }}</p>
    <template v-else-if="summary">
      <p v-if="summary.connection" class="text-sm text-surface-600">
        <span class="font-medium text-surface-800">{{ summary.connection.displayName }}</span>
        <span v-if="summary.connection.connectedThroughMeta" class="text-emerald-700"> · Connected through Meta</span>
        <span v-else> · Public Tracking</span>
      </p>
      <p v-else class="text-sm text-surface-500">Track a Facebook Page on this site to include social performance.</p>

      <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <ReportKpiTile
          label="Followers"
          :value="formatNum(summary.metrics.followers)"
          :hint="summary.metrics.followers.asOf ? `as of ${summary.metrics.followers.asOf}` : 'current point-in-time'"
          :delta="summary.metrics.followerGrowth.available ? summary.metrics.followerGrowth.value : null"
          :delta-label="summary.metrics.followerGrowth.available ? growthLabel(summary.metrics.followerGrowth) : undefined"
          tone="primary"
          compact
        />
        <ReportKpiTile
          label="Reach"
          :value="formatNum(summary.metrics.reach)"
          :hint="
            summary.metrics.reach.available
              ? `Unique media viewers${summary.metrics.reach.periodLabel ? ` · ${summary.metrics.reach.periodLabel}` : ''}`
              : summary.metrics.reach.unsupportedReason || 'Unavailable'
          "
          tone="cyan"
          compact
        />
        <ReportKpiTile
          label="Engagement"
          :value="formatNum(summary.metrics.engagement)"
          :hint="
            summary.metrics.engagement.available
              ? `${summary.metrics.engagement.periodType === 'day' ? 'during selected period' : 'during stored period'}${
                  summary.metrics.engagement.periodLabel ? ` · ${summary.metrics.engagement.periodLabel}` : ''
                }`
              : summary.metrics.engagement.unsupportedReason || 'Unavailable'
          "
          tone="green"
          compact
        />
        <ReportKpiTile
          label="Posts"
          :value="formatNum(summary.metrics.postsPublished)"
          :hint="
            summary.metrics.postsPublished.available
              ? `${summary.metrics.postsPublished.periodType === 'range' ? 'during selected period' : 'during stored period'}${
                  summary.metrics.postsPublished.periodLabel ? ` · ${summary.metrics.postsPublished.periodLabel}` : ''
                }`
              : summary.metrics.postsPublished.unsupportedReason || 'Unavailable'
          "
          tone="purple"
          compact
        />
      </div>

      <p
        v-if="summary.connection && !summary.connection.connectedThroughMeta"
        class="text-xs text-surface-500"
      >
        Connect Meta to include reach and engagement.
      </p>
      <p v-else-if="summary.publicMetricsUnavailableReason" class="text-xs text-surface-500">
        {{ summary.publicMetricsUnavailableReason }}
      </p>
    </template>
  </div>
</template>
