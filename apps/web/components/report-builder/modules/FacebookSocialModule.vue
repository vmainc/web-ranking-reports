<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'
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
  <div class="p-4">
    <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Facebook</p>
    <p v-if="loading" class="mt-3 text-sm text-surface-500">Loading…</p>
    <p v-else-if="error" class="mt-3 text-sm text-red-700">{{ error }}</p>
    <template v-else-if="summary">
      <p v-if="summary.connection" class="mt-1 text-sm text-surface-600">
        {{ summary.connection.displayName }}
        <span v-if="summary.connection.connectedThroughMeta" class="text-emerald-700"> · Connected through Meta</span>
        <span v-else> · Public Tracking</span>
      </p>
      <p v-else class="mt-2 text-sm text-surface-500">Track a Facebook Page on this site to include social performance.</p>

      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p class="text-xs text-surface-500">Followers</p>
          <p class="text-xl font-semibold text-surface-900">{{ formatNum(summary.metrics.followers) }}</p>
          <p class="text-[11px] text-surface-500">
            {{ summary.metrics.followers.asOf ? `as of ${summary.metrics.followers.asOf}` : 'current point-in-time' }}
          </p>
          <p
            v-if="summary.metrics.followerGrowth.available"
            class="text-xs"
            :class="(summary.metrics.followerGrowth.value || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'"
          >
            {{ growthLabel(summary.metrics.followerGrowth) }}
          </p>
          <p v-if="summary.metrics.followerGrowth.available" class="text-[11px] text-surface-500">
            during selected period
          </p>
        </div>
        <div>
          <p class="text-xs text-surface-500">Reach</p>
          <p class="text-xl font-semibold text-surface-900">{{ formatNum(summary.metrics.reach) }}</p>
          <p v-if="summary.metrics.reach.available" class="text-[11px] text-surface-500">
            Unique media viewers
            <span v-if="summary.metrics.reach.periodLabel"> · {{ summary.metrics.reach.periodLabel }}</span>
          </p>
          <p v-else class="text-[11px] text-surface-500">
            {{ summary.metrics.reach.unsupportedReason || 'Unavailable' }}
          </p>
        </div>
        <div>
          <p class="text-xs text-surface-500">Engagement</p>
          <p class="text-xl font-semibold text-surface-900">{{ formatNum(summary.metrics.engagement) }}</p>
          <p v-if="summary.metrics.engagement.available" class="text-[11px] text-surface-500">
            during stored period
            <span v-if="summary.metrics.engagement.periodLabel"> · {{ summary.metrics.engagement.periodLabel }}</span>
          </p>
          <p v-else class="text-[11px] text-surface-500">
            {{ summary.metrics.engagement.unsupportedReason || 'Unavailable' }}
          </p>
        </div>
        <div>
          <p class="text-xs text-surface-500">Posts</p>
          <p class="text-xl font-semibold text-surface-900">{{ formatNum(summary.metrics.postsPublished) }}</p>
          <p v-if="summary.metrics.postsPublished.available" class="text-[11px] text-surface-500">
            during stored period
            <span v-if="summary.metrics.postsPublished.periodLabel"> · {{ summary.metrics.postsPublished.periodLabel }}</span>
          </p>
          <p v-else class="text-[11px] text-surface-500">
            {{ summary.metrics.postsPublished.unsupportedReason || 'Unavailable' }}
          </p>
        </div>
      </div>

      <p
        v-if="summary.connection && !summary.connection.connectedThroughMeta"
        class="mt-3 text-xs text-surface-500"
      >
        Connect Meta to include reach and engagement.
      </p>
      <p v-else-if="summary.publicMetricsUnavailableReason" class="mt-3 text-xs text-surface-500">
        {{ summary.publicMetricsUnavailableReason }}
      </p>
    </template>
  </div>
</template>
