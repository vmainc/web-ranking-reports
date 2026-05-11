<template>
  <ReportCard
    v-if="showCard"
    title="Ecommerce"
    :subtitle="subtitle"
    :report-mode="reportMode"
    :show-menu="showMenu"
    chart-height="auto"
    @remove="$emit('remove')"
    @move-up="$emit('move-up')"
    @move-down="$emit('move-down')"
  >
    <div v-if="error" :class="dv ? 'py-4 text-sm text-rose-400' : 'py-4 text-sm text-red-600'">{{ error }}</div>
    <template v-else-if="loaded">
      <div v-if="!data?.available" :class="dv ? 'py-4 text-sm text-slate-500' : 'py-4 text-sm text-surface-500'">No ecommerce data for this property.</div>
      <template v-else>
        <div class="mb-4 grid grid-cols-3 gap-3">
          <div
            :class="
              dv
                ? 'rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/5 p-3'
                : 'rounded-lg border border-surface-200 bg-surface-50/50 p-3'
            "
          >
            <p :class="dv ? 'text-xs font-medium text-emerald-300/90' : 'text-xs font-medium text-surface-500'">Revenue</p>
            <p :class="dv ? 'text-xl font-semibold text-white' : 'text-xl font-semibold text-surface-900'">{{ fmtCurrency(data.summary!.totalRevenue) }}</p>
          </div>
          <div
            :class="
              dv
                ? 'rounded-xl border border-[#3b82f6]/25 bg-[#3b82f6]/5 p-3'
                : 'rounded-lg border border-surface-200 bg-surface-50/50 p-3'
            "
          >
            <p :class="dv ? 'text-xs font-medium text-sky-300/90' : 'text-xs font-medium text-surface-500'">Purchases</p>
            <p :class="dv ? 'text-xl font-semibold text-white' : 'text-xl font-semibold text-surface-900'">{{ fmtNum(data.summary!.purchases) }}</p>
          </div>
          <div
            :class="
              dv
                ? 'rounded-xl border border-[#8b5cf6]/25 bg-[#8b5cf6]/5 p-3'
                : 'rounded-lg border border-surface-200 bg-surface-50/50 p-3'
            "
          >
            <p :class="dv ? 'text-xs font-medium text-violet-300/90' : 'text-xs font-medium text-surface-500'">Avg. order</p>
            <p :class="dv ? 'text-xl font-semibold text-white' : 'text-xl font-semibold text-surface-900'">{{ fmtCurrency(data.summary!.averagePurchaseRevenue) }}</p>
          </div>
        </div>
        <SimpleTable
          v-if="data.topItems?.length"
          :columns="[
            { label: 'Item', field: 'itemName' },
            { label: 'Revenue', field: 'itemRevenue', format: (v) => fmtCurrency(Number(v)) },
            { label: 'Quantity', field: 'itemsPurchased', format: (v) => fmtNum(Number(v)) },
          ]"
          :rows="data.topItems"
        />
      </template>
    </template>
    <p v-else :class="dv ? 'py-4 text-sm text-slate-500' : 'py-4 text-sm text-surface-500'">Loading…</p>
  </ReportCard>
</template>

<script setup lang="ts">
import ReportCard from '~/components/report/ReportCard.vue'
import SimpleTable from '~/components/report/SimpleTable.vue'
import { fmtNum, fmtCurrency } from '~/utils/format'
import { getApiErrorMessage } from '~/utils/apiError'

const props = withDefaults(
  defineProps<{
    siteId: string
    range?: string
    startDate?: string
    endDate?: string
    subtitle?: string
    reportMode?: boolean
    showMenu?: boolean
  }>(),
  { range: 'last_28_days', reportMode: false, showMenu: true }
)
defineEmits<{ (e: 'remove'): void; (e: 'move-up'): void; (e: 'move-down'): void }>()

const dv = useDashboardVibrant()
const { getHeaders } = useReportAuth()
const data = ref<{
  available: boolean
  summary?: { totalRevenue: number; purchases: number; averagePurchaseRevenue: number }
  topItems?: Array<{ itemName: string; itemRevenue: number; itemsPurchased: number }>
} | null>(null)
const loaded = ref(false)
const error = ref('')

const showCard = computed(() => {
  if (error.value) return true
  if (!loaded.value) return true
  return data.value?.available !== false
})

async function load() {
  error.value = ''
  loaded.value = false
  try {
    data.value = await $fetch('/api/ga4/ecommerce', {
      query: {
        siteId: props.siteId,
        range: props.range,
        ...(props.startDate && props.endDate ? { startDate: props.startDate, endDate: props.endDate } : {}),
      },
      headers: getHeaders(),
    }) as typeof data.value
    loaded.value = true
  } catch (e) {
    error.value = getApiErrorMessage(e)
  }
}

watch([() => props.siteId, () => props.range], load, { immediate: true })
</script>
