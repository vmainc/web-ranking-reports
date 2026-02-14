<template>
  <ReportCard
    title="Top pages"
    :subtitle="subtitle"
    :report-mode="reportMode"
    :show-menu="showMenu"
    chart-height="auto"
    @remove="$emit('remove')"
    @move-up="$emit('move-up')"
    @move-down="$emit('move-down')"
  >
    <div v-if="error" class="py-4 text-sm text-red-600">{{ error }}</div>
    <SimpleTable
      v-else-if="rows.length"
      :columns="[
        { label: 'Page', field: 'pagePath', tdClass: 'max-w-[200px] truncate' },
        { label: 'Views', field: 'views', format: (v) => fmtNum(Number(v)) },
        { label: 'Users', field: 'users', format: (v) => fmtNum(Number(v)) },
        { label: 'Eng. time', field: 'engagementTime', format: (v) => fmtDuration(Number(v) / 1000) },
      ]"
      :rows="rows"
      empty-message="No page data for this period."
    />
    <p v-else-if="loaded" class="py-4 text-sm text-surface-500">No page data for this period.</p>
    <p v-else class="py-4 text-sm text-surface-500">Loading…</p>
  </ReportCard>
</template>

<script setup lang="ts">
import ReportCard from '~/components/report/ReportCard.vue'
import SimpleTable from '~/components/report/SimpleTable.vue'
import { fmtNum, fmtDuration } from '~/utils/format'
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
const rows = ref<Array<{ pagePath: string; views: number; users: number; engagementTime: number }>>([])
const loaded = ref(false)
const error = ref('')

async function load() {
  error.value = ''
  loaded.value = false
  try {
    const res = await $fetch<{ rows: Array<{ pagePath: string; views: number; users: number; engagementTime: number }> }>('/api/ga4/top-pages', {
      query: { siteId: props.siteId, range: props.range, limit: String(props.limit) },
      headers: getHeaders(),
    })
    rows.value = res.rows ?? []
    loaded.value = true
  } catch (e) {
    error.value = getApiErrorMessage(e)
  }
}

watch([() => props.siteId, () => props.range, () => props.limit], load, { immediate: true })
</script>
