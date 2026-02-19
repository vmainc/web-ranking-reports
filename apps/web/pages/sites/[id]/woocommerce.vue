<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div v-if="pending" class="flex justify-center py-12">
      <p class="text-surface-500">Loading…</p>
    </div>

    <template v-else-if="site">
      <div class="mb-8">
        <NuxtLink
          :to="`/sites/${site.id}`"
          class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
        >
          ← {{ site.name }}
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-surface-900">WooCommerce</h1>
        <p class="mt-1 text-sm text-surface-500">Revenue, orders, and top products from your store.</p>
      </div>

      <!-- Not configured -->
      <div
        v-if="configLoaded && !configured"
        class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800"
      >
        <p class="font-medium">WooCommerce API is not configured.</p>
        <p class="mt-1 text-sm">Add your WooCommerce API keys in the Integrations section (click the cog on the WooCommerce card). Store URL is optional — the site’s domain is used if you leave it blank.</p>
        <NuxtLink :to="`/sites/${site.id}`" class="mt-4 inline-block text-sm font-medium underline">
          Go to {{ site.name }} →
        </NuxtLink>
      </div>

      <template v-else-if="configured">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 class="text-lg font-medium text-surface-900">Sales report</h2>
          <div class="flex flex-wrap items-center gap-2">
            <input
              v-model="startDate"
              type="date"
              class="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <span class="text-surface-400">–</span>
            <input
              v-model="endDate"
              type="date"
              class="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <button
              type="button"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
              :disabled="reportLoading"
              @click="loadReport"
            >
              {{ reportLoading ? 'Loading…' : 'Refresh' }}
            </button>
          </div>
        </div>

<div v-if="reportError" class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p class="font-medium">{{ reportError }}</p>
          <p v-if="reportError.includes('No route') || reportError.includes('no route')" class="mt-3">
            Fix: In WordPress go to Settings → Permalinks and choose <strong>Post name</strong> (not Plain). Then confirm the Store URL in Integrations matches your site (e.g. https://yourstore.com).
          </p>
          <p class="mt-3 text-red-700">
            Update credentials in <NuxtLink :to="`/sites/${siteId}`" class="underline">the site page</NuxtLink> or the Integrations cog on the site page. If you left Store URL blank, the app uses this site’s domain — ensure that domain is correct and your WooCommerce store is at that URL with the REST API enabled.
          </p>
          </div>

        <div v-if="reportLoading && !report" class="flex justify-center py-12 text-sm text-surface-500">
          Loading report…
        </div>
        <template v-else-if="report">
          <!-- Summary cards -->
          <section class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-surface-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
              <p class="text-sm font-medium text-surface-500">Total revenue</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">
                {{ formatCurrency(report.totalRevenue) }}
              </p>
              <p class="mt-0.5 text-xs text-surface-500">{{ report.startDate }} – {{ report.endDate }}</p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
              <p class="text-sm font-medium text-surface-500">Orders</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">
                {{ report.totalOrders.toLocaleString() }}
              </p>
              <p class="mt-0.5 text-xs text-surface-500">Completed & processing</p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
              <p class="text-sm font-medium text-surface-500">Avg order value</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">
                {{ formatCurrency(report.totalOrders ? report.totalRevenue / report.totalOrders : 0) }}
              </p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
              <p class="text-sm font-medium text-surface-500">Days with sales</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">
                {{ report.revenueByDay?.length ?? 0 }}
              </p>
            </div>
          </section>

          <!-- Revenue over time -->
          <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
            <h3 class="mb-4 text-lg font-medium text-surface-900">Revenue over time</h3>
            <div ref="revenueChartEl" class="h-[300px] w-full" />
          </section>

          <!-- Orders over time -->
          <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
            <h3 class="mb-4 text-lg font-medium text-surface-900">Orders per day</h3>
            <div ref="ordersChartEl" class="h-[280px] w-full" />
          </section>

          <!-- Top products -->
          <section class="mb-8 rounded-xl border border-surface-200 bg-white shadow-sm overflow-hidden">
            <h3 class="border-b border-surface-200 bg-surface-50 px-4 py-3 text-lg font-medium text-surface-900">
              Top products by revenue
            </h3>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-surface-200">
                <thead class="bg-surface-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Product</th>
                    <th class="px-4 py-3 text-right text-xs font-medium uppercase text-surface-500">Quantity</th>
                    <th class="px-4 py-3 text-right text-xs font-medium uppercase text-surface-500">Revenue</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-200 bg-white">
                  <tr v-for="p in report.topProducts" :key="p.id" class="text-sm">
                    <td class="px-4 py-3 font-medium text-surface-900">{{ p.name }}</td>
                    <td class="px-4 py-3 text-right text-surface-700">{{ p.quantity.toLocaleString() }}</td>
                    <td class="px-4 py-3 text-right font-medium text-surface-900">{{ formatCurrency(p.revenue) }}</td>
                  </tr>
                  <tr v-if="report.topProducts.length === 0">
                    <td colspan="3" class="px-4 py-8 text-center text-surface-500">No product data for this period.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>

        <div v-else-if="report && report.totalOrders === 0" class="rounded-xl border border-surface-200 bg-white p-12 text-center text-sm text-surface-500">
          No orders in this period. Try a different date range.
        </div>
      </template>
    </template>

    <div v-else class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-500">Site not found.</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-primary-600 hover:underline">Back to Dashboard</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import { getSite } from '~/services/sites'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)

const pb = usePocketbase()
const site = ref<SiteRecord | null>(null)
const pending = ref(true)
const configLoaded = ref(false)
const configured = ref(false)
const report = ref<{
  startDate: string
  endDate: string
  totalRevenue: number
  totalOrders: number
  revenueByDay: Array<{ date: string; value: number }>
  ordersByDay: Array<{ date: string; count: number }>
  topProducts: Array<{ id: number; name: string; quantity: number; revenue: number }>
} | null>(null)
const reportLoading = ref(false)
const reportLoaded = ref(false)
const reportError = ref('')

const endD = new Date()
const startD = new Date()
startD.setDate(startD.getDate() - 30)
const startDate = ref(startD.toISOString().slice(0, 10))
const endDate = ref(endD.toISOString().slice(0, 10))

const revenueChartEl = ref<HTMLElement | null>(null)
const ordersChartEl = ref<HTMLElement | null>(null)
let revenueChart: import('echarts').ECharts | null = null
let ordersChart: import('echarts').ECharts | null = null

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value)
}

async function loadConfig() {
  configLoaded.value = false
  const token = pb.authStore.token
  try {
    const data = await $fetch<{ configured: boolean }>('/api/woocommerce/config', {
      query: { siteId: siteId.value },
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    })
    configured.value = data.configured
  } catch {
    configured.value = false
  } finally {
    configLoaded.value = true
  }
}

async function loadReport() {
  if (!configured.value) return
  reportError.value = ''
  reportLoading.value = true
  reportLoaded.value = false
  const token = pb.authStore.token
  try {
    const data = await $fetch<typeof report.value>('/api/woocommerce/report', {
      query: {
        siteId: siteId.value,
        startDate: startDate.value,
        endDate: endDate.value,
      },
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    })
    report.value = data
    reportLoaded.value = true
    await nextTick()
    renderCharts()
  } catch (e: unknown) {
    const err = e as {
      data?: { message?: string }
      message?: string
      statusCode?: number
      response?: { _data?: { message?: string } }
    }
    let msg =
      err?.data?.message ??
      err?.response?._data?.message ??
      err?.message ??
      'Failed to load report.'
    if (msg.includes('<!') || msg.includes('doctype') || msg.includes('Unexpected token')) {
      msg = 'The server returned an invalid response. Check the store URL and API keys in Integrations (cog), and that the store is reachable.'
    }
    reportError.value = msg
  } finally {
    reportLoading.value = false
  }
}

function renderCharts() {
  if (!report.value) return

  const revenueData = report.value.revenueByDay ?? []
  const ordersData = report.value.ordersByDay ?? []

  if (revenueChartEl.value && revenueData.length > 0) {
    import('echarts').then((echarts) => {
      if (revenueChart) revenueChart.dispose()
      revenueChart = echarts.init(revenueChartEl.value!)
      revenueChart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
        xAxis: { type: 'category', data: revenueData.map((d) => d.date), boundaryGap: false },
        yAxis: {
          type: 'value',
          axisLabel: { formatter: (v: number) => '$' + (v >= 1000 ? (v / 1000) + 'k' : v) },
        },
        series: [
          {
            name: 'Revenue',
            type: 'line',
            smooth: true,
            areaStyle: { opacity: 0.2 },
            lineStyle: { width: 2 },
            itemStyle: { color: '#059669' },
            data: revenueData.map((d) => d.value),
          },
        ],
      })
    })
  }

  if (ordersChartEl.value && ordersData.length > 0) {
    import('echarts').then((echarts) => {
      if (ordersChart) ordersChart.dispose()
      ordersChart = echarts.init(ordersChartEl.value!)
      ordersChart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
        xAxis: { type: 'category', data: ordersData.map((d) => d.date) },
        yAxis: { type: 'value', minInterval: 1 },
        series: [
          {
            name: 'Orders',
            type: 'bar',
            itemStyle: { color: '#2563eb' },
            data: ordersData.map((d) => d.count),
          },
        ],
      })
    })
  }
}

onMounted(async () => {
  try {
    site.value = await getSite(pb, siteId.value)
  } catch {
    site.value = null
  } finally {
    pending.value = false
  }
  await loadConfig()
  if (configured.value) await loadReport()
})

watch([startDate, endDate], () => {
  if (configured.value) loadReport()
})

onUnmounted(() => {
  revenueChart?.dispose()
  ordersChart?.dispose()
})
</script>
