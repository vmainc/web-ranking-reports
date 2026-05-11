<template>
  <div class="mb-10 space-y-8">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 class="text-lg font-bold tracking-tight text-white sm:text-xl">Overview</h2>
        <p class="mt-1 text-sm text-slate-400">Live snapshot for the selected range — rankings, traffic, conversions.</p>
      </div>
      <div
        class="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300"
      >
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" aria-hidden="true" />
        Insights refresh with your widgets
      </div>
    </div>

    <!-- KPI strip -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article
        v-for="(k, i) in kpiDisplay"
        :key="k.label"
        class="dv-stat group relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/50 p-5 shadow-lg shadow-black/20"
        :style="{ animationDelay: `${i * 0.06}s` }"
      >
        <div
          class="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-30 blur-2xl transition group-hover:opacity-50"
          :class="k.glow"
        />
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ k.label }}</p>
        <p class="mt-2 text-3xl font-bold tabular-nums text-white">{{ k.value }}</p>
        <p v-if="k.delta != null" class="mt-2 flex items-center gap-1 text-sm font-semibold" :class="k.delta >= 0 ? 'text-[#22c55e]' : 'text-rose-400'">
          <svg v-if="k.delta >= 0" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
          <svg v-else class="h-4 w-4 rotate-180" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
          {{ k.delta > 0 ? '+' : '' }}{{ k.delta }}% vs prior
        </p>
        <p v-else class="mt-2 text-xs text-slate-500">Enable compare on the toolbar for deltas.</p>
      </article>
    </div>

    <div class="grid gap-6 lg:grid-cols-5">
      <!-- Keyword movement -->
      <article class="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-6 shadow-xl shadow-black/15 lg:col-span-2">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-bold uppercase tracking-wide text-[#22c55e]">Keyword visibility</h3>
          <NuxtLink :to="`/sites/${siteId}/rank-tracking`" class="text-xs font-semibold text-[#3b82f6] hover:underline">Rank tracker</NuxtLink>
        </div>
        <p class="mt-1 text-xs text-slate-500">Best current positions in your workspace.</p>
        <div v-if="rankPending" class="mt-6 space-y-2">
          <div v-for="n in 5" :key="n" class="h-10 animate-pulse rounded-lg bg-slate-800/80" />
        </div>
        <div v-else-if="!rankRows.length" class="mt-6 rounded-xl border border-dashed border-slate-600 px-4 py-8 text-center text-sm text-slate-500">
          Add keywords in rank tracking to populate this panel.
        </div>
        <ul v-else class="mt-5 space-y-2">
          <li
            v-for="row in rankRows"
            :key="row.id"
            class="flex items-center justify-between gap-3 rounded-xl border border-slate-700/50 bg-slate-950/40 px-3 py-2.5 text-sm"
          >
            <span class="min-w-0 truncate font-medium text-slate-200">{{ row.keyword }}</span>
            <span class="flex shrink-0 items-center gap-2">
              <span
                class="rounded-md px-2 py-0.5 text-xs font-bold tabular-nums"
                :class="positionPillClass(row.position)"
              >
                #{{ row.position }}
              </span>
              <span v-if="row.position <= 10" class="text-[#22c55e]" aria-hidden="true" title="Page-one territory">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
              </span>
            </span>
          </li>
        </ul>
      </article>

      <!-- Traffic analytics -->
      <article class="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-6 shadow-xl shadow-black/15 lg:col-span-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-sm font-bold uppercase tracking-wide text-[#3b82f6]">Traffic analytics</h3>
          <span class="text-xs font-medium text-slate-500">Sessions by day</span>
        </div>
        <div v-if="trafficPending" class="mt-8 h-40 animate-pulse rounded-xl bg-slate-800/80" />
        <div v-else class="relative mt-6 h-44 w-full">
          <svg class="h-full w-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="dv-sess-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
              </linearGradient>
              <linearGradient id="dv-sess-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#22c55e" />
                <stop offset="50%" stop-color="#3b82f6" />
                <stop offset="100%" stop-color="#8b5cf6" />
              </linearGradient>
            </defs>
            <path :d="trafficAreaPath" fill="url(#dv-sess-area)" class="dv-chart-area" />
            <path
              :d="trafficLinePath"
              fill="none"
              stroke="url(#dv-sess-line)"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="dv-chart-line"
            />
          </svg>
          <div class="mt-2 flex justify-between text-[10px] font-medium uppercase tracking-wider text-slate-500">
            <span>{{ trafficStartLabel }}</span>
            <span>{{ trafficEndLabel }}</span>
          </div>
        </div>
        <div class="mt-4 grid grid-cols-3 gap-3 border-t border-slate-700/50 pt-4">
          <div class="text-center">
            <p class="text-[10px] font-semibold uppercase text-slate-500">Peak day</p>
            <p class="mt-1 text-sm font-bold text-white">{{ trafficPeak ?? '—' }}</p>
          </div>
          <div class="text-center">
            <p class="text-[10px] font-semibold uppercase text-slate-500">Total sessions</p>
            <p class="mt-1 text-sm font-bold text-[#3b82f6]">{{ fmtNum(trafficTotal) }}</p>
          </div>
          <div class="text-center">
            <p class="text-[10px] font-semibold uppercase text-slate-500">7d shape</p>
            <p class="mt-1 text-sm font-bold text-[#22c55e]">{{ trafficShapeLabel }}</p>
          </div>
        </div>
      </article>
    </div>

    <!-- Conversion highlights -->
    <article class="rounded-2xl border border-amber-400/25 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-purple-950/30 p-6 shadow-xl shadow-amber-500/5">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="text-sm font-bold uppercase tracking-wide text-[#facc15]">Conversion highlights</h3>
          <p class="mt-1 max-w-xl text-sm text-slate-400">
            Engagement depth and intent signals from GA4 — pair with rank gains to explain pipeline impact.
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <div class="rounded-xl border border-[#facc15]/30 bg-[#facc15]/10 px-4 py-3">
            <p class="text-[10px] font-bold uppercase text-amber-200/90">Engaged sessions</p>
            <p class="mt-1 text-xl font-bold tabular-nums text-white">{{ convDisplay.engaged }}</p>
          </div>
          <div class="rounded-xl border border-[#8b5cf6]/35 bg-[#8b5cf6]/10 px-4 py-3">
            <p class="text-[10px] font-bold uppercase text-purple-200/90">Engagement rate</p>
            <p class="mt-1 text-xl font-bold tabular-nums text-white">{{ convDisplay.rate }}</p>
          </div>
          <div class="rounded-xl border border-[#22c55e]/35 bg-[#22c55e]/10 px-4 py-3">
            <p class="text-[10px] font-bold uppercase text-emerald-200/90">Avg. session</p>
            <p class="mt-1 text-xl font-bold tabular-nums text-white">{{ convDisplay.duration }}</p>
          </div>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { fmtNum, fmtPct, fmtDuration } from '~/utils/format'
import { getDateRangeForPreset, getCompareDateRange, eachDayInclusive, sessionsSeriesForDays } from '~/utils/dateRange'
import type { DateRangePreset } from '~/utils/dateRange'

const props = defineProps<{
  siteId: string
  range: string
  compareEnabled: boolean
  startDate: string
  endDate: string
}>()

const { getHeaders } = useReportAuth()

type Summary = {
  activeUsers: number
  sessions: number
  screenPageViews: number
  engagedSessions: number
  engagementRate: number
  averageSessionDuration: number
}

const rankPending = ref(true)
const trafficPending = ref(true)
const kpiCurrent = ref<Summary | null>(null)
const kpiPrevious = ref<Summary | null>(null)
const trafficSeries = ref<number[]>([])
const trafficLabels = ref<string[]>([])

const rankRows = ref<Array<{ id: string; keyword: string; position: number }>>([])

function pctDelta(cur: number, prev: number): number | null {
  if (prev === 0) return cur > 0 ? 100 : 0
  return Math.round(((cur - prev) / prev) * 1000) / 10
}

const kpiDisplay = computed(() => {
  const cur = kpiCurrent.value
  const prev = kpiPrevious.value
  const cmp = props.compareEnabled && prev
  const dUsers = cmp ? pctDelta(cur?.activeUsers ?? 0, prev.activeUsers) : null
  const dSess = cmp ? pctDelta(cur?.sessions ?? 0, prev.sessions) : null
  const dViews = cmp ? pctDelta(cur?.screenPageViews ?? 0, prev.screenPageViews) : null
  const dEng = cmp ? pctDelta(cur?.engagementRate ?? 0, prev.engagementRate) : null
  return [
    {
      label: 'Users',
      value: fmtNum(cur?.activeUsers ?? 0),
      delta: dUsers,
      glow: 'bg-[#3b82f6]',
    },
    {
      label: 'Sessions',
      value: fmtNum(cur?.sessions ?? 0),
      delta: dSess,
      glow: 'bg-[#22c55e]',
    },
    {
      label: 'Page views',
      value: fmtNum(cur?.screenPageViews ?? 0),
      delta: dViews,
      glow: 'bg-[#8b5cf6]',
    },
    {
      label: 'Engagement rate',
      value: fmtPct((cur?.engagementRate ?? 0) * 100),
      delta: dEng,
      glow: 'bg-[#facc15]',
    },
  ]
})

const convDisplay = computed(() => ({
  engaged: fmtNum(kpiCurrent.value?.engagedSessions ?? 0),
  rate: fmtPct((kpiCurrent.value?.engagementRate ?? 0) * 100),
  duration: fmtDuration(kpiCurrent.value?.averageSessionDuration ?? 0),
}))

const trafficTotal = computed(() => trafficSeries.value.reduce((a, b) => a + b, 0))

const trafficPeak = computed(() => {
  const vals = trafficSeries.value
  if (!vals.length) return null as string | null
  let maxI = 0
  for (let i = 1; i < vals.length; i++) if (vals[i] > vals[maxI]) maxI = i
  const v = vals[maxI]
  const label = trafficLabels.value[maxI] ?? ''
  return `${label} · ${fmtNum(v)}`
})

const trafficShapeLabel = computed(() => {
  const s = trafficSeries.value
  if (s.length < 3) return '—'
  const a = s[0] ?? 0
  const b = s[Math.floor(s.length / 2)] ?? 0
  const c = s[s.length - 1] ?? 0
  if (c > a && c > b) return 'Climbing'
  if (c < a && c < b) return 'Cooling'
  return 'Steady'
})

const trafficLinePath = computed(() => {
  const vals = trafficSeries.value
  if (!vals.length) return ''
  const w = 400
  const h = 100
  const pad = 8
  const max = Math.max(...vals, 1)
  const step = (w - pad * 2) / Math.max(vals.length - 1, 1)
  return vals
    .map((v, i) => {
      const x = pad + i * step
      const y = pad + (1 - v / max) * (h - pad * 2)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

const trafficAreaPath = computed(() => {
  const line = trafficLinePath.value
  if (!line) return ''
  return `${line} L392,108 L8,108 Z`
})

const trafficStartLabel = computed(() => trafficLabels.value[0] ?? '')
const trafficEndLabel = computed(() => trafficLabels.value[trafficLabels.value.length - 1] ?? '')

function positionPillClass(pos: number) {
  if (pos <= 3) return 'bg-[#22c55e]/20 text-[#22c55e]'
  if (pos <= 10) return 'bg-[#3b82f6]/20 text-[#3b82f6]'
  if (pos <= 20) return 'bg-[#8b5cf6]/20 text-[#a78bfa]'
  return 'bg-slate-700 text-slate-300'
}

async function loadRank() {
  rankPending.value = true
  try {
    const res = await $fetch<{ keywords: Array<{ id: string; keyword: string; last_result_json?: { position?: number } | null }> }>(
      `/api/sites/${props.siteId}/rank-tracking/list`,
      { query: { skipBackfill: 1 }, headers: getHeaders() },
    ).catch(() => ({ keywords: [] }))
    rankRows.value = (res.keywords ?? [])
      .map((k) => ({
        id: k.id,
        keyword: k.keyword,
        position: typeof k.last_result_json?.position === 'number' && k.last_result_json.position > 0 ? k.last_result_json.position : 999,
      }))
      .filter((k) => k.position < 999)
      .sort((a, b) => a.position - b.position)
      .slice(0, 6)
  } finally {
    rankPending.value = false
  }
}

async function loadTrafficAndKpi() {
  trafficPending.value = true
  try {
    const preset = props.range as DateRangePreset
    const { startDate, endDate } =
      props.startDate && props.endDate ? { startDate: props.startDate, endDate: props.endDate } : getDateRangeForPreset(preset)
    const headers = getHeaders()
    const empty: Summary = {
      activeUsers: 0,
      sessions: 0,
      screenPageViews: 0,
      engagedSessions: 0,
      engagementRate: 0,
      averageSessionDuration: 0,
    }

    const currentRes = await $fetch<{ summary: Summary | null; rows: Array<{ date: string; sessions: number }> }>(
      '/api/google/analytics/report',
      { query: { siteId: props.siteId, startDate, endDate }, headers },
    )
    kpiCurrent.value = { ...empty, ...currentRes.summary }

    const mainDays = eachDayInclusive(startDate, endDate)
    trafficLabels.value = mainDays.map((iso) => {
      const [, m, d] = iso.split('-')
      return `${m}/${d}`
    })
    trafficSeries.value = sessionsSeriesForDays(mainDays, currentRes.rows ?? [])

    if (props.compareEnabled) {
      const comp = getCompareDateRange(startDate, endDate)
      const prevRes = await $fetch<{ summary: Summary | null }>('/api/google/analytics/report', {
        query: { siteId: props.siteId, startDate: comp.startDate, endDate: comp.endDate },
        headers,
      })
      kpiPrevious.value = { ...empty, ...prevRes.summary }
    } else {
      kpiPrevious.value = null
    }
  } catch {
    kpiCurrent.value = null
    kpiPrevious.value = null
    trafficSeries.value = []
    trafficLabels.value = []
  } finally {
    trafficPending.value = false
  }
}

watch(
  () => [props.siteId, props.range, props.compareEnabled, props.startDate, props.endDate] as const,
  () => {
    void loadRank()
    void loadTrafficAndKpi()
  },
  { immediate: true },
)
</script>

<style scoped>
.dv-stat {
  animation: dv-stat-in 0.55s ease-out both;
}
@keyframes dv-stat-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.dv-chart-line {
  stroke-dasharray: 500;
  stroke-dashoffset: 500;
  animation: dv-draw 1.6s ease-out 0.15s forwards;
}
.dv-chart-area {
  opacity: 0;
  animation: dv-fade 0.7s ease-out 0.9s forwards;
}
@keyframes dv-draw {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes dv-fade {
  to {
    opacity: 1;
  }
}
</style>
