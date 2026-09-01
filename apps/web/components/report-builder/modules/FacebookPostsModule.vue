<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'
import { getDateRangeForPreset } from '~/utils/dateRange'
import FacebookPostsTable from '~/components/social/FacebookPostsTable.vue'

const props = defineProps<{
  module: Extract<ReportModule, { type: 'facebook_posts' }>
}>()

const { rangePreset } = useReportDateRange()
const siteIdRef = inject<Ref<string | null>>('reportBuilderSiteId', ref(null))
const siteId = computed(() => siteIdRef.value)
const pb = usePocketbase()

type PostRow = {
  id: string
  publishedAt: string
  message: string
  permalink: string
  mediaUrl: string
  mediaType: string
  reactions: number | null
  comments: number | null
  shares: number | null
  reach: number | null
  views: number | null
  clicks: number | null
}

type Summary = {
  connection: { displayName: string; connectedThroughMeta: boolean } | null
  posts?: PostRow[]
}

const loading = ref(false)
const error = ref('')
const summary = ref<Summary | null>(null)

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const maxPosts = computed(() => {
  const n = Number(props.module.settings.maxPosts)
  if (!Number.isFinite(n) || n < 1) return 8
  return Math.min(25, Math.round(n))
})

const posts = computed(() => (summary.value?.posts || []).slice(0, maxPosts.value))

async function load() {
  error.value = ''
  summary.value = null
  if (!siteId.value) {
    error.value = 'Select a site to load Facebook posts.'
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
    error.value = err?.data?.message ?? err?.message ?? 'Could not load Facebook posts.'
  } finally {
    loading.value = false
  }
}

watch([siteId, rangePreset, maxPosts], () => {
  void load()
}, { immediate: true })
</script>

<template>
  <div class="p-4">
    <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Facebook posts</p>
    <p v-if="loading" class="mt-3 text-sm text-surface-500">Loading…</p>
    <p v-else-if="error" class="mt-3 text-sm text-red-700">{{ error }}</p>
    <template v-else-if="summary">
      <p v-if="summary.connection" class="mt-1 text-sm text-surface-600">
        {{ summary.connection.displayName }}
        <span v-if="summary.connection.connectedThroughMeta" class="text-emerald-700"> · Connected through Meta</span>
      </p>
      <p v-else class="mt-2 text-sm text-surface-500">Track a Facebook Page on this site to include posts.</p>
      <div class="mt-3">
        <FacebookPostsTable :posts="posts" compact empty-text="No posts in this date range yet." />
      </div>
    </template>
  </div>
</template>
