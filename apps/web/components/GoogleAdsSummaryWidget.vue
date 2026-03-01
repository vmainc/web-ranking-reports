<template>
  <div class="space-y-6">
    <div v-if="summaryError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{{ summaryError }}</div>
    <template v-else-if="summary">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-xl border-2 border-primary-200 bg-primary-50/50 p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-primary-700">Cost</p>
          <p class="mt-1 text-3xl font-bold text-primary-900">${{ summary.summary.cost.toFixed(2) }}</p>
        </div>
        <div class="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Conversions</p>
          <p class="mt-1 text-3xl font-bold text-emerald-900">{{ summary.summary.conversions.toLocaleString(undefined, { maximumFractionDigits: 1 }) }}</p>
        </div>
        <div class="rounded-xl border-2 border-sky-200 bg-sky-50/50 p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-sky-700">Clicks</p>
          <p class="mt-1 text-3xl font-bold text-sky-900">{{ summary.summary.clicks.toLocaleString() }}</p>
        </div>
        <div class="rounded-xl border-2 border-violet-200 bg-violet-50/50 p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-violet-700">Conv. rate</p>
          <p class="mt-1 text-3xl font-bold text-violet-900">{{ summary.summary.clicks ? ((summary.summary.conversions / summary.summary.clicks) * 100).toFixed(1) : '0' }}%</p>
        </div>
        <div class="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-amber-700">Impressions</p>
          <p class="mt-1 text-3xl font-bold text-amber-900">{{ summary.summary.impressions.toLocaleString() }}</p>
        </div>
        <div class="rounded-xl border-2 border-slate-200 bg-slate-50/50 p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-700">CTR</p>
          <p class="mt-1 text-3xl font-bold text-slate-900">{{ summary.summary.impressions ? ((summary.summary.clicks / summary.summary.impressions) * 100).toFixed(2) : '0' }}%</p>
        </div>
      </div>
    </template>
    <p v-else-if="summaryLoading" class="py-4 text-sm text-surface-500">Loading Google Ads data…</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ siteId: string }>()
const { getAdsSummary } = useGoogleIntegration()

const summary = ref<{
  startDate: string
  endDate: string
  summary: { impressions: number; clicks: number; cost: number; conversions: number }
} | null>(null)
const summaryLoading = ref(false)
const summaryError = ref('')

function defaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) }
}

async function load() {
  if (!props.siteId) return
  summaryError.value = ''
  summaryLoading.value = true
  summary.value = null
  try {
    const { startDate, endDate } = defaultDateRange()
    summary.value = await getAdsSummary(props.siteId, startDate, endDate)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    summaryError.value = err?.data?.message ?? (e instanceof Error ? e.message : String(e)) ?? 'Failed to load Google Ads data.'
  } finally {
    summaryLoading.value = false
  }
}

onMounted(() => load())
watch(() => props.siteId, () => load())
</script>
