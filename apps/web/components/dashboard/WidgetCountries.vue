<template>
  <ReportCard
    title="Top countries"
    :subtitle="subtitle"
    :report-mode="reportMode"
    :show-menu="showMenu"
    chart-height="820px"
    @remove="$emit('remove')"
    @move-up="$emit('move-up')"
    @move-down="$emit('move-down')"
  >
    <div v-if="error" class="py-4 text-sm text-red-600">{{ error }}</div>
    <template v-else-if="loaded">
      <div class="h-[220px] w-full shrink-0">
        <div v-if="mapError" class="flex h-full items-center justify-center rounded border border-surface-200 bg-surface-50 text-sm text-surface-500">
          {{ mapError }}
        </div>
        <div v-else ref="mapEl" class="h-full w-full" />
      </div>
      <div class="border-t border-surface-100 pt-4">
        <h3 class="mb-2 text-sm font-semibold text-surface-700">By country</h3>
        <div ref="chartEl" class="h-[240px] w-full" />
      </div>
      <div class="border-t border-surface-100 pt-4">
        <h3 class="mb-2 text-sm font-semibold text-surface-700">By city</h3>
        <div ref="cityChartEl" class="h-[240px] w-full" />
        <p v-if="cityRows.length === 0 && !cityError" class="py-2 text-sm text-surface-500">No city data for this period.</p>
        <p v-if="cityError" class="py-2 text-sm text-red-600">{{ cityError }}</p>
      </div>
    </template>
    <p v-else class="py-4 text-sm text-surface-500">Loading…</p>
  </ReportCard>
</template>

<script setup lang="ts">
import ReportCard from '~/components/report/ReportCard.vue'
import { getApiErrorMessage } from '~/utils/apiError'

/** Same-origin proxy to avoid CORS; see server/api/geo/world.get.ts */
const WORLD_GEO_URL = '/api/geo/world'

/** GA4 country names -> ECharts world GeoJSON feature names */
const COUNTRY_NAME_MAP: Record<string, string> = {
  'United States of America': 'United States',
  'United Kingdom of Great Britain and Northern Ireland': 'United Kingdom',
  'Viet Nam': 'Vietnam',
  'Republic of Korea': 'South Korea',
  "Democratic People's Republic of Korea": 'North Korea',
  'Iran (Islamic Republic of)': 'Iran',
  "Lao People's Democratic Republic": 'Laos',
  'Russian Federation': 'Russia',
  'Syrian Arab Republic': 'Syria',
  'Taiwan, Province of China': 'Taiwan',
  'Tanzania, United Republic of': 'Tanzania',
  'Venezuela (Bolivarian Republic of)': 'Venezuela',
  'Bolivia (Plurinational State of)': 'Bolivia',
  'Czechia': 'Czech Republic',
  'Hong Kong': 'China', // or keep Hong Kong if map has it
}

function normalizeCountryName(ga4Name: string): string {
  return COUNTRY_NAME_MAP[ga4Name] ?? ga4Name
}

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
const mapEl = ref<HTMLElement | null>(null)
const chartEl = ref<HTMLElement | null>(null)
const cityChartEl = ref<HTMLElement | null>(null)
const loaded = ref(false)
const error = ref('')
const mapError = ref('')
const cityError = ref('')
const US_STATE_CODES: Record<string, string> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
  'District of Columbia': 'DC',
}

function formatCityLabel(row: { city: string; country: string; region?: string }): string {
  const country = row.country || ''
  if (country === 'United States' || country === 'United States of America') {
    const region = row.region?.trim() || ''
    const code = region ? US_STATE_CODES[region] : undefined
    if (code) return `${row.city}, ${code}`
    // Fallback: city only if we know it's US but no region
    return row.city
  }
  return country ? `${row.city} (${country})` : row.city
}

const cityRows = ref<Array<{ city: string; country: string; region?: string; users: number; sessions: number; views: number }>>([])
let mapChart: import('echarts').ECharts | null = null
let barChart: import('echarts').ECharts | null = null
let cityChart: import('echarts').ECharts | null = null

let worldGeoJson: unknown = null

async function fetchWorldGeo(): Promise<unknown> {
  if (worldGeoJson) return worldGeoJson
  const res = await fetch(WORLD_GEO_URL)
  if (!res.ok) throw new Error('Failed to load world map')
  worldGeoJson = await res.json()
  return worldGeoJson
}

async function load() {
  error.value = ''
  mapError.value = ''
  cityError.value = ''
  cityRows.value = []
  loaded.value = false
  try {
    const res = await $fetch<{ rows: Array<{ country: string; users: number; sessions: number; views: number }> }>('/api/ga4/countries', {
      query: { siteId: props.siteId, range: props.range, limit: String(props.limit) },
      headers: getHeaders(),
    })
    const rows = res.rows ?? []
    loaded.value = true
    await nextTick()

    const echarts = await import('echarts')

    if (rows.length) {
      const mapData = rows.map((r) => ({
        name: normalizeCountryName(r.country),
        value: r.users,
      }))
      const maxVal = Math.max(...mapData.map((d) => d.value), 1)

      if (mapEl.value) {
        try {
          const geoJson = await fetchWorldGeo()
          echarts.registerMap('world', geoJson as Parameters<typeof echarts.registerMap>[1])
          if (mapChart) mapChart.dispose()
          mapChart = echarts.init(mapEl.value)
          mapChart.setOption({
            tooltip: { trigger: 'item', formatter: (p: { name: string; value?: number }) => `${p.name}: ${p.value ?? 0} users` },
            visualMap: {
              min: 0,
              max: maxVal,
              text: ['High', 'Low'],
              realtime: false,
              calculable: true,
              inRange: { color: ['#e0e7ff', '#6366f1', '#3730a3'] },
              left: 8,
              bottom: 8,
            },
            series: [
              {
                name: 'Users',
                type: 'map',
                map: 'world',
                roam: true,
                emphasis: { label: { show: true }, itemStyle: { areaColor: '#818cf8' } },
                data: mapData,
              },
            ],
          })
          mapChart.resize()
        } catch (e) {
          console.warn('World map failed, showing bar chart only', e)
          mapError.value = 'Map unavailable'
        }
      }

      if (chartEl.value) {
        if (barChart) barChart.dispose()
        barChart = echarts.init(chartEl.value)
        barChart.setOption({
          grid: { left: 80, right: 24, top: 16, bottom: 24 },
          xAxis: { type: 'value', splitLine: { lineStyle: { color: '#e5e7eb' } } },
          yAxis: { type: 'category', data: rows.map((r) => r.country).reverse(), axisLabel: { fontSize: 10 } },
          series: [{ type: 'bar', data: rows.map((r) => r.users).reverse(), itemStyle: { color: '#2563eb' } }],
          tooltip: { trigger: 'axis' },
        })
      }
    }

    cityError.value = ''
    try {
      const cityRes = await $fetch<{
        rows: Array<{ city: string; country: string; region?: string; users: number; sessions: number; views: number }>
      }>('/api/ga4/cities', {
        query: { siteId: props.siteId, range: props.range, limit: '15' },
        headers: getHeaders(),
      })
      cityRows.value = cityRes.rows ?? []
      await nextTick()
      if (cityChartEl.value && cityRows.value.length) {
        const labels = cityRows.value.map((r) => formatCityLabel(r)).reverse()
        const data = cityRows.value.map((r) => r.users).reverse()
        if (cityChart) cityChart.dispose()
        cityChart = echarts.init(cityChartEl.value)
        cityChart.setOption({
          grid: { left: 120, right: 24, top: 16, bottom: 24 },
          xAxis: { type: 'value', splitLine: { lineStyle: { color: '#e5e7eb' } } },
          yAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10 } },
          series: [{ type: 'bar', data, itemStyle: { color: '#059669' } }],
          tooltip: { trigger: 'axis' },
        })
        cityChart.resize()
      }
    } catch (e) {
      cityError.value = getApiErrorMessage(e)
    }
  } catch (e) {
    error.value = getApiErrorMessage(e)
  }
}

watch([() => props.siteId, () => props.range, () => props.limit], load, { immediate: true })

function onResize() {
  mapChart?.resize()
  barChart?.resize()
  cityChart?.resize()
}
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  mapChart?.dispose()
  barChart?.dispose()
  cityChart?.dispose()
})
</script>
