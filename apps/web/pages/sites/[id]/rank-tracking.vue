<template>
  <SiteIntegrationShell max-width="7xl">
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
        <h1 class="text-2xl font-semibold text-surface-900">Rank tracking</h1>
        <p class="mt-1 text-sm text-surface-500">
          Track where {{ site.domain }} ranks for your keywords. Up to
          <strong>{{ maxKeywords }} keywords</strong> on this site for your current plan (workspace total applies across sites).
        </p>
        <p class="mt-2 text-sm text-surface-700">
          <span class="font-medium text-surface-900">Tracking:</span>
          {{ rankContextLabel }}
        </p>
        <p class="mt-1 text-sm text-surface-600">
          Positions update when you add keywords, and automatically Tuesday and Friday mornings (default US Central). Volume is US monthly search volume.
        </p>
        <p v-if="refreshPending" class="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          Refreshing rankings for the current tracking location…
        </p>
        <p v-if="loadError" class="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {{ loadError }}
        </p>
      </div>

      <!-- Tracking location -->
      <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="mb-1 text-lg font-medium text-surface-900">Ranking location</h2>
        <p class="mb-4 text-sm text-surface-500">
          City-level Google rankings for local businesses. Changing location refreshes all keywords for the new series (old history is kept separately).
        </p>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div class="min-w-0 flex-1">
            <label for="loc-search" class="mb-1 block text-xs font-medium uppercase tracking-wide text-surface-500">
              Search DataForSEO locations (US)
            </label>
            <input
              id="loc-search"
              v-model="locationQuery"
              type="search"
              autocomplete="off"
              class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="e.g. Kansas City"
              @input="onLocationQueryInput"
            />
            <ul
              v-if="locationResults.length"
              class="mt-2 max-h-48 overflow-auto rounded-lg border border-surface-200 bg-white text-sm shadow-sm"
            >
              <li v-for="loc in locationResults" :key="loc.location_code">
                <button
                  type="button"
                  class="flex w-full items-start justify-between gap-2 px-3 py-2 text-left hover:bg-surface-50"
                  :disabled="locationSaving"
                  @click="selectLocation(loc)"
                >
                  <span class="text-surface-900">{{ loc.location_name }}</span>
                  <span class="shrink-0 text-xs text-surface-400">{{ loc.location_type || loc.location_code }}</span>
                </button>
              </li>
            </ul>
          </div>
          <label class="flex items-center gap-2 text-sm text-surface-700">
            <input v-model="includeSubdomains" type="checkbox" class="rounded border-surface-300" @change="saveIncludeSubdomains" />
            Include subdomains
          </label>
        </div>
        <p v-if="locationNotice" class="mt-2 text-sm text-emerald-700">{{ locationNotice }}</p>
        <p v-if="locationError" class="mt-2 text-sm text-red-600">{{ locationError }}</p>
      </section>

      <!-- Add keyword(s) -->
      <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="mb-3 text-lg font-medium text-surface-900">Add keywords</h2>
        <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="addKeyword">
          <div class="min-w-[240px] flex-1">
            <label for="new-keywords" class="mb-1 block text-xs font-medium uppercase tracking-wide text-surface-500">
              Keywords
            </label>
            <textarea
              id="new-keywords"
              v-model="newKeywordsRaw"
              rows="3"
              class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="One keyword per line&#10;e.g. best coffee roasters&#10;best coffee beans online"
            />
            <p class="mt-1 text-xs text-surface-500">
              {{ remainingKeywords }} of {{ maxKeywords }} slots available. New rows fetch Live monthly volume when DataForSEO is configured.
            </p>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <button
              type="submit"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
              :disabled="addLoading || keywords.length >= maxKeywords"
            >
              {{ addLoading ? 'Adding…' : 'Add keywords' }}
            </button>
            <NuxtLink
              v-if="workspacePlan === 'free' && remainingKeywords === 0"
              to="/dashboard/billing"
              class="inline-flex items-center justify-center rounded-lg border border-primary-600 bg-white px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm transition hover:bg-primary-50"
            >
              View plans &amp; upgrade
            </NuxtLink>
          </div>
        </form>
        <p v-if="addNotice" class="mt-2 text-sm text-emerald-700">{{ addNotice }}</p>
        <p v-if="addError" class="mt-2 text-sm text-red-600">{{ addError }}</p>
        <p v-if="keywords.length >= maxKeywords" class="mt-2 text-sm text-amber-700">
          Maximum {{ maxKeywords }} keywords on this site for your plan. Remove one to add more.
        </p>
      </section>

      <div class="mb-4">
        <div>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 class="text-lg font-medium text-surface-900">Keywords &amp; rankings</h2>
              <p v-if="keywords.length && latestRankingsFetchedLabel" class="mt-1 text-sm text-surface-500">
                Last rankings update: {{ latestRankingsFetchedLabel }}
              </p>
              <p v-else-if="keywords.length" class="mt-1 text-sm text-surface-500">No rankings fetched yet.</p>
            </div>
            <button
              v-if="manualRankRefreshAllowed"
              type="button"
              class="inline-flex items-center justify-center rounded-lg border border-primary-600 bg-white px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="refreshLoading || keywords.length === 0"
              @click="refreshRankings"
            >
              {{ refreshLoading ? 'Refreshing…' : 'Refresh rankings' }}
            </button>
          </div>
          <p v-if="refreshNotice" class="mt-2 text-sm text-emerald-700">{{ refreshNotice }}</p>
          <p v-if="refreshError" class="mt-2 text-sm text-red-600">{{ refreshError }}</p>
        </div>
      </div>

      <section v-if="keywords.length" class="mb-6 grid gap-3 sm:grid-cols-3">
        <article class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Tracked keywords</p>
          <p class="mt-1 text-2xl font-semibold text-surface-900">{{ keywords.length }}</p>
        </article>
        <article class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Average rank</p>
          <p class="mt-1 text-2xl font-semibold text-surface-900">{{ avgRankLabel }}</p>
          <p class="mt-1 text-xs" :class="avgRankChangeClass">{{ avgRankChangeLabel }}</p>
        </article>
        <article class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Top movers</p>
          <p v-if="topMovers.length === 0" class="mt-2 text-sm text-surface-500">No movement data yet.</p>
          <ul v-else class="mt-2 space-y-1">
            <li v-for="m in topMovers" :key="m.id" class="flex items-center justify-between text-sm">
              <span class="truncate text-surface-700">{{ m.keyword }}</span>
              <span :class="m.dir === 'up' ? 'text-emerald-700' : 'text-red-700'">
                {{ m.dir === 'up' ? '+' : '-' }}{{ m.spots }}
              </span>
            </li>
          </ul>
        </article>
      </section>

      <!-- Keywords table -->
      <section class="rounded-xl border border-surface-200 bg-white shadow-sm overflow-hidden">
        <div v-if="keywords.length === 0" class="p-8 text-center text-surface-500">
          No keywords yet. Add a keyword above to start tracking.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-surface-200">
            <thead class="bg-surface-50">
              <tr>
                <th
                  class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500 cursor-pointer select-none"
                  @click="changeSort('keyword')"
                >
                  Keyword
                  <span v-if="sortKey === 'keyword'" class="ml-1 text-[10px] align-middle">
                    {{ sortDir === 'asc' ? '▲' : '▼' }}
                  </span>
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500 cursor-pointer select-none"
                  @click="changeSort('position')"
                >
                  Position
                  <span v-if="sortKey === 'position'" class="ml-1 text-[10px] align-middle">
                    {{ sortDir === 'asc' ? '▲' : '▼' }}
                  </span>
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500 cursor-pointer select-none"
                  title="US monthly volume from DataForSEO Google Ads Search Volume (country-level, not city)."
                  @click="changeSort('volume')"
                >
                  Volume
                  <span class="ml-1 text-[10px] font-normal normal-case tracking-normal text-surface-400">(US)</span>
                  <span v-if="sortKey === 'volume'" class="ml-1 text-[10px] align-middle">
                    {{ sortDir === 'asc' ? '▲' : '▼' }}
                  </span>
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Change</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Trend</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">URL</th>
                <th class="px-4 py-3 w-20 text-right text-xs font-medium uppercase text-surface-500">Remove</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-200 bg-white">
              <tr v-for="kw in sortedKeywords" :key="kw.id" class="hover:bg-surface-50/50">
                <td class="px-4 py-3 text-sm font-medium text-surface-900">{{ kw.keyword }}</td>
                <td class="px-4 py-3 text-sm">
                  <template v-if="positionDisplay(kw).kind === 'ranked'">
                    <span class="font-semibold text-primary-600" :title="positionDisplay(kw).title">{{ positionDisplay(kw).label }}</span>
                  </template>
                  <template v-else-if="positionDisplay(kw).kind === 'not_ranked'">
                    <span class="text-surface-500" :title="positionDisplay(kw).title">{{ positionDisplay(kw).label }}</span>
                  </template>
                  <template v-else-if="positionDisplay(kw).kind === 'pending'">
                    <span class="text-sky-700" :title="positionDisplay(kw).title">{{ positionDisplay(kw).label }}</span>
                  </template>
                  <template v-else-if="positionDisplay(kw).kind === 'error'">
                    <span class="text-amber-700" :title="positionDisplay(kw).title">{{ positionDisplay(kw).label }}</span>
                  </template>
                  <span v-else class="text-surface-400">—</span>
                </td>
                <td class="px-4 py-3 text-sm">
                  <span v-if="keywordVolumeDisplay(kw) != null" class="font-medium text-surface-900">
                    {{ keywordVolumeDisplay(kw)!.toLocaleString() }}
                  </span>
                  <span v-else class="text-surface-400">—</span>
                </td>
                <td class="px-4 py-3 text-sm">
                  <span :class="changeClass(kw)">
                    {{ changeLabel(kw) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm">
                  <button
                    type="button"
                    class="rounded border border-surface-200 px-2 py-1 text-xs font-medium text-surface-700 hover:bg-surface-50"
                    @click="openHistoryModal(kw)"
                  >
                    Sparkline
                  </button>
                </td>
                <td class="max-w-[280px] px-4 py-3 text-sm">
                  <template v-if="kw.last_result_json?.url">
                    <a
                      :href="kw.last_result_json.url"
                      target="_blank"
                      rel="noopener"
                      class="truncate block font-mono text-xs text-primary-600 hover:underline"
                      :title="rankingUrlTooltip(kw.last_result_json)"
                    >
                      {{ rankingUrlPath(kw.last_result_json.url) }}
                    </a>
                  </template>
                  <span v-else class="text-surface-400">—</span>
                </td>
                <td class="px-4 py-3 text-right">
                  <button
                    type="button"
                    class="rounded p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    :disabled="deleteLoading === kw.id"
                    title="Remove keyword"
                    @click="removeKeyword(kw.id)"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div
        v-if="showHistoryModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        @click.self="closeHistoryModal"
      >
        <div class="w-full max-w-2xl rounded-xl border border-surface-200 bg-white p-5 shadow-xl">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold text-surface-900">Keyword trend</h3>
              <p class="mt-1 text-sm text-surface-600">{{ historyKeyword }}</p>
            </div>
            <button type="button" class="rounded border border-surface-200 px-2 py-1 text-sm text-surface-600 hover:bg-surface-50" @click="closeHistoryModal">
              Close
            </button>
          </div>

          <p v-if="historyLoading" class="py-8 text-center text-sm text-surface-500">Loading history…</p>
          <p v-else-if="historyError" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ historyError }}</p>
          <p v-else-if="historyPoints.length < 2" class="rounded-lg border border-surface-200 bg-surface-50 p-3 text-sm text-surface-600">
            Not enough history yet. Add more refresh cycles to view trend.
          </p>
          <div v-else>
            <svg viewBox="0 0 640 220" class="h-56 w-full rounded-lg border border-surface-200 bg-surface-50">
              <polyline
                :points="historyPolylinePoints"
                fill="none"
                stroke="#2563eb"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle
                v-for="pt in historySvgPoints"
                :key="pt.id"
                :cx="pt.x"
                :cy="pt.y"
                r="3.5"
                fill="#2563eb"
              />
            </svg>
            <div class="mt-3 flex items-center justify-between text-xs text-surface-500">
              <span>Older</span>
              <span>Lower line = better rank</span>
              <span>Newest</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-500">Site not found.</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-primary-600 hover:underline">Back to Dashboard</NuxtLink>
    </div>
  </SiteIntegrationShell>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import type { GoogleStatusResponse } from '~/composables/useGoogleIntegration'
import { getSite } from '~/services/sites'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'
import { rankPositionDisplay } from '~/utils/rankTrackingDisplay'

interface RankKeyword {
  id: string
  site: string
  keyword: string
  search_volume?: number | null
  last_result_json?: {
    position?: number
    previousPosition?: number | null
    changeSpots?: number | null
    changeDirection?: 'up' | 'down' | 'same' | 'new' | 'lost' | 'none'
    rankAbsolute?: number
    url?: string
    title?: string
    description?: string
    fetchedAt?: string
    error?: string
    rankingStatus?: string
    lastFetchError?: string
    errorType?: string
    contextStale?: boolean
  } | null
  created: string
  updated: string
}
const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()
const { getStatus } = useGoogleIntegration()

const site = ref<SiteRecord | null>(null)
const keywords = ref<RankKeyword[]>([])
const maxKeywords = ref(100)
const workspacePlan = ref<string | null>(null)
const pending = ref(true)
const newKeywordsRaw = ref('')
const addLoading = ref(false)
const addError = ref('')
const addNotice = ref('')
const refreshLoading = ref(false)
const refreshError = ref('')
const refreshNotice = ref('')
const loadError = ref('')
const deleteLoading = ref<string | null>(null)
const googleStatus = ref<GoogleStatusResponse | null>(null)
const sortKey = ref<'keyword' | 'position' | 'volume'>('keyword')
const sortDir = ref<'asc' | 'desc'>('asc')
const showHistoryModal = ref(false)
const historyKeyword = ref('')
const historyPoints = ref<Array<{ id: string; rank: number; at: string }>>([])
const historyLoading = ref(false)
const historyError = ref('')
const rankContextLabel = ref('United States · Desktop · Google Organic')
const refreshPending = ref(false)
const locationQuery = ref('')
const locationResults = ref<
  Array<{ location_code: number; location_name: string; location_type?: string | null }>
>([])
const locationSaving = ref(false)
const locationNotice = ref('')
const locationError = ref('')
const includeSubdomains = ref(true)
let locationSearchTimer: ReturnType<typeof setTimeout> | null = null
let refreshPollTimer: ReturnType<typeof setTimeout> | null = null
const remainingKeywords = computed(() =>
  Math.max(0, maxKeywords.value - keywords.value.length),
)
const manualRankRefreshAllowed = computed(() => {
  const model = pb.authStore.model as { email?: string } | null
  return String(model?.email || '').trim().toLowerCase() === 'doughigson@gmail.com'
})

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

/** Most recent `last_result_json.fetchedAt` across all keywords (same display as former per-row column). */
const latestRankingsFetchedLabel = computed(() => {
  let latestMs = 0
  for (const kw of keywords.value) {
    const at = kw.last_result_json?.fetchedAt
    if (!at) continue
    const t = new Date(at).getTime()
    if (!Number.isNaN(t) && t > latestMs) latestMs = t
  }
  if (latestMs === 0) return null
  return formatDate(new Date(latestMs).toISOString())
})

const movementRows = computed(() =>
  keywords.value
    .filter((kw) => {
      const dir = kw.last_result_json?.changeDirection
      const spots = kw.last_result_json?.changeSpots
      return (dir === 'up' || dir === 'down') && typeof spots === 'number' && spots > 0
    })
    .map((kw) => ({
      id: kw.id,
      keyword: kw.keyword,
      spots: kw.last_result_json!.changeSpots as number,
      dir: kw.last_result_json!.changeDirection as 'up' | 'down',
    })),
)

const topMovers = computed(() => [...movementRows.value].sort((a, b) => b.spots - a.spots).slice(0, 3))

const avgRankSummary = computed(() => {
  let currentCount = 0
  let currentTotal = 0
  let previousCount = 0
  let previousTotal = 0
  for (const kw of keywords.value) {
    const current = kw.last_result_json?.position
    if (typeof current === 'number' && current > 0) {
      currentTotal += current
      currentCount += 1
    }
    const prev = kw.last_result_json?.previousPosition
    if (typeof prev === 'number' && prev > 0) {
      previousTotal += prev
      previousCount += 1
    }
  }
  const avgCurrent = currentCount ? currentTotal / currentCount : null
  const avgPrevious = previousCount ? previousTotal / previousCount : null
  return { avgCurrent, avgPrevious }
})

const avgRankLabel = computed(() => {
  if (avgRankSummary.value.avgCurrent == null) return '—'
  return `#${avgRankSummary.value.avgCurrent.toFixed(1)}`
})

const avgRankChangeLabel = computed(() => {
  const { avgCurrent, avgPrevious } = avgRankSummary.value
  if (avgCurrent == null || avgPrevious == null) return 'Not enough comparison data'
  const delta = avgPrevious - avgCurrent
  if (delta > 0) return `Improved by ${delta.toFixed(1)} positions`
  if (delta < 0) return `Down by ${Math.abs(delta).toFixed(1)} positions`
  return 'No net change'
})

const avgRankChangeClass = computed(() => {
  const { avgCurrent, avgPrevious } = avgRankSummary.value
  if (avgCurrent == null || avgPrevious == null) return 'text-surface-500'
  const delta = avgPrevious - avgCurrent
  if (delta > 0) return 'text-emerald-700'
  if (delta < 0) return 'text-red-700'
  return 'text-surface-500'
})

const historySvgPoints = computed(() => {
  const points = historyPoints.value.filter((p) => Number.isFinite(p.rank))
  if (!points.length) return []
  const width = 640
  const height = 220
  const padX = 24
  const padY = 18
  const maxRank = Math.max(...points.map((p) => p.rank), 1)
  const minRank = Math.min(...points.map((p) => p.rank), 1)
  const rankSpan = Math.max(maxRank - minRank, 1)
  const xStep = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0
  return points.map((p, idx) => {
    const x = padX + idx * xStep
    const norm = (p.rank - minRank) / rankSpan
    const y = padY + norm * (height - padY * 2)
    return { id: p.id, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 }
  })
})

const historyPolylinePoints = computed(() => historySvgPoints.value.map((p) => `${p.x},${p.y}`).join(' '))

const sortedKeywords = computed(() => {
  const list = [...keywords.value]
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1

  return list.sort((a, b) => {
    if (key === 'keyword') {
      return a.keyword.localeCompare(b.keyword) * dir
    }

    if (key === 'position') {
      const posA =
        typeof a.last_result_json?.position === 'number' && a.last_result_json.position > 0
          ? a.last_result_json.position
          : Number.POSITIVE_INFINITY
      const posB =
        typeof b.last_result_json?.position === 'number' && b.last_result_json.position > 0
          ? b.last_result_json.position
          : Number.POSITIVE_INFINITY
      if (posA === posB) return a.keyword.localeCompare(b.keyword) * dir
      return (posA - posB) * dir
    }

    // volume (stored monthly volume from research, else GSC impressions)
    const volA = keywordVolumeDisplay(a) ?? -1
    const volB = keywordVolumeDisplay(b) ?? -1
    if (volA === volB) return a.keyword.localeCompare(b.keyword) * dir
    return (volA - volB) * dir
  })
})

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Path (+ query) of the ranking URL so homepage vs inner pages is obvious in the table. */
function rankingUrlPath(url: string): string {
  try {
    const u = new URL(url)
    const path = `${u.pathname}${u.search || ''}`
    return path || '/'
  } catch {
    return url
  }
}

function positionDisplay(kw: RankKeyword) {
  return rankPositionDisplay(kw.last_result_json)
}

function rankingUrlTooltip(json: NonNullable<RankKeyword['last_result_json']>): string {
  const lines: string[] = []
  if (json.url) lines.push(json.url)
  if (json.title) lines.push(json.title)
  return lines.join('\n')
}

function changeLabel(kw: RankKeyword): string {
  const dir = kw.last_result_json?.changeDirection
  const spots = kw.last_result_json?.changeSpots
  if (dir === 'up' && typeof spots === 'number') return `▲ +${spots}`
  if (dir === 'down' && typeof spots === 'number') return `▼ -${spots}`
  if (dir === 'new') return 'New ranking'
  if (dir === 'lost') return 'Lost ranking'
  if (dir === 'same' && spots === 0) return 'No change'
  return '—'
}

function changeClass(kw: RankKeyword): string {
  const dir = kw.last_result_json?.changeDirection
  if (dir === 'up') return 'font-medium text-emerald-700'
  if (dir === 'down') return 'font-medium text-red-700'
  if (dir === 'new') return 'font-medium text-emerald-700'
  if (dir === 'lost') return 'font-medium text-red-700'
  return 'text-surface-500'
}

function closeHistoryModal() {
  showHistoryModal.value = false
}

async function openHistoryModal(kw: RankKeyword) {
  if (!site.value) return
  showHistoryModal.value = true
  historyKeyword.value = kw.keyword
  historyLoading.value = true
  historyError.value = ''
  historyPoints.value = []
  try {
    const res = await $fetch<{
      snapshots?: Array<{ id: string; position: number; fetched_at: string }>
      keywordRankings?: Array<{ id: string; rank: number; checked_at: string }>
    }>(`/api/sites/${site.value.id}/rank-tracking/keyword/${kw.id}/history`, { headers: authHeaders() })
    const fromKeywordRankings = (res.keywordRankings ?? [])
      .filter((r) => typeof r.rank === 'number' && r.rank >= 0 && r.checked_at)
      .map((r) => ({ id: r.id, rank: r.rank, at: r.checked_at }))
    const fromSnapshots = (res.snapshots ?? [])
      .filter((r) => typeof r.position === 'number' && r.fetched_at)
      .map((r) => ({ id: r.id, rank: r.position, at: r.fetched_at }))
    const chosen = fromKeywordRankings.length ? fromKeywordRankings : fromSnapshots
    historyPoints.value = chosen.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    historyError.value = err?.data?.message ?? err?.message ?? 'Failed to load history.'
  } finally {
    historyLoading.value = false
  }
}

/** DataForSEO monthly volume stored on the row. */
function keywordVolumeDisplay(kw: RankKeyword): number | null {
  if (typeof kw.search_volume === 'number' && !Number.isNaN(kw.search_volume)) return kw.search_volume
  return null
}

function changeSort(key: 'keyword' | 'position' | 'volume') {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = key === 'position' ? 'asc' : 'desc'
  }
}

async function loadSite() {
  site.value = await getSite(pb, siteId.value)
}

async function loadGoogleStatus() {
  if (!site.value) return
  try {
    googleStatus.value = await getStatus(site.value.id)
  } catch {
    googleStatus.value = null
  }
}

async function loadKeywords() {
  if (!site.value) return
  loadError.value = ''
  try {
    const res = await $fetch<{
      keywords: RankKeyword[]
      maxKeywords: number
      plan?: string
      rankContext?: { label?: string }
      refreshPending?: boolean
    }>(`/api/sites/${site.value.id}/rank-tracking/list`, { headers: authHeaders() })
    keywords.value = res.keywords
    maxKeywords.value = res.maxKeywords
    workspacePlan.value = typeof res.plan === 'string' ? res.plan : null
    if (res.rankContext?.label) rankContextLabel.value = res.rankContext.label
    refreshPending.value = !!res.refreshPending
    if (refreshPending.value) scheduleRefreshPoll()
  } catch (e: unknown) {
    const err = e as { statusCode?: number; data?: { message?: string }; message?: string }
    keywords.value = []
    if (err?.statusCode === 503 || err?.statusCode === 404) {
      loadError.value = err?.data?.message ?? err?.message ?? 'Rank tracking is not set up. Create the PocketBase collection by running: node scripts/create-collections.mjs from the apps/web directory.'
    } else {
      loadError.value = err?.data?.message ?? err?.message ?? 'Could not load keywords.'
    }
  }
}

async function loadRankConfig() {
  if (!site.value) return
  try {
    const res = await $fetch<{
      label?: string
      config?: { include_subdomains?: boolean }
    }>(`/api/sites/${site.value.id}/rank-tracking/config`, { headers: authHeaders() })
    if (res.label) rankContextLabel.value = res.label
    if (typeof res.config?.include_subdomains === 'boolean') {
      includeSubdomains.value = res.config.include_subdomains
    }
  } catch {
    // defaults remain
  }
}

function onLocationQueryInput() {
  if (locationSearchTimer) clearTimeout(locationSearchTimer)
  locationSearchTimer = setTimeout(() => {
    void searchLocations()
  }, 280)
}

async function searchLocations() {
  if (!site.value) return
  locationError.value = ''
  try {
    const q = locationQuery.value.trim()
    const res = await $fetch<{
      results: Array<{ location_code: number; location_name: string; location_type?: string | null }>
    }>(`/api/sites/${site.value.id}/rank-tracking/locations`, {
      headers: authHeaders(),
      query: { q },
    })
    locationResults.value = res.results || []
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    locationResults.value = []
    locationError.value = err?.data?.message ?? err?.message ?? 'Location search failed.'
  }
}

async function selectLocation(loc: {
  location_code: number
  location_name: string
  location_type?: string | null
}) {
  if (!site.value) return
  locationSaving.value = true
  locationError.value = ''
  locationNotice.value = ''
  try {
    const res = await $fetch<{
      label?: string
      refreshPending?: boolean
      message?: string
    }>(`/api/sites/${site.value.id}/rank-tracking/config`, {
      method: 'PUT',
      headers: authHeaders(),
      body: {
        location_code: loc.location_code,
        location_name: loc.location_name,
        location_type: loc.location_type || undefined,
        include_subdomains: includeSubdomains.value,
      },
    })
    if (res.label) rankContextLabel.value = res.label
    locationNotice.value = res.message || 'Location saved.'
    locationResults.value = []
    locationQuery.value = ''
    refreshPending.value = !!res.refreshPending
    await loadKeywords()
    if (refreshPending.value) scheduleRefreshPoll()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    locationError.value = err?.data?.message ?? err?.message ?? 'Could not save location.'
  } finally {
    locationSaving.value = false
  }
}

async function saveIncludeSubdomains() {
  if (!site.value) return
  // Persist toggle without forcing a full identity refresh unless location also changes —
  // still save via config using current location from label/config endpoint.
  try {
    const cfg = await $fetch<{
      config: { location_code: number; location_name: string }
    }>(`/api/sites/${site.value.id}/rank-tracking/config`, { headers: authHeaders() })
    await $fetch(`/api/sites/${site.value.id}/rank-tracking/config`, {
      method: 'PUT',
      headers: authHeaders(),
      body: {
        location_code: cfg.config.location_code,
        location_name: cfg.config.location_name,
        include_subdomains: includeSubdomains.value,
      },
    })
  } catch {
    // non-fatal
  }
}

function scheduleRefreshPoll() {
  if (refreshPollTimer) clearTimeout(refreshPollTimer)
  refreshPollTimer = setTimeout(async () => {
    await loadKeywords()
    if (refreshPending.value) scheduleRefreshPoll()
  }, 8000)
}

async function addKeyword() {
  if (!site.value) return

  addError.value = ''
  addNotice.value = ''

  const lines = newKeywordsRaw.value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (!lines.length) {
    addError.value = 'Enter at least one keyword (one per line).'
    return
  }

  // Deduplicate while preserving order
  const seen = new Set<string>()
  const unique = lines.filter((k) => {
    const norm = k.toLowerCase()
    if (seen.has(norm)) return false
    seen.add(norm)
    return true
  })

  const available = Math.max(0, maxKeywords.value - keywords.value.length)
  if (available <= 0) {
    addError.value = `Maximum ${maxKeywords.value} keywords on this site for your plan. Remove one to add more.`
    return
  }

  const toSend = unique.slice(0, available)
  addLoading.value = true
  try {
    const res = await $fetch<{
      ranksFetched?: number
      createdCount?: number
      rankFetchPending?: boolean
    }>(
      `/api/sites/${site.value.id}/rank-tracking/list`,
      {
        method: 'POST',
        body: { keywords: toSend },
        headers: authHeaders(),
      }
    )
    newKeywordsRaw.value = ''
    await loadKeywords()
    if (res.rankFetchPending) {
      addNotice.value =
        'Keywords added. Rankings are fetching in the background—the table will fill in over the next few minutes.'
    } else {
      const n = typeof res.ranksFetched === 'number' ? res.ranksFetched : 0
      if (n > 0) {
        addNotice.value = `Fetched current rankings for ${n} new keyword${n === 1 ? '' : 's'}.`
      }
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    addError.value = err?.data?.message ?? err?.message ?? 'Failed to add keywords'
  } finally {
    addLoading.value = false
  }
}

async function refreshRankings() {
  if (!site.value || !manualRankRefreshAllowed.value) return
  refreshLoading.value = true
  refreshError.value = ''
  refreshNotice.value = ''
  try {
    const res = await $fetch<{ updated?: number; message?: string }>(
      `/api/sites/${site.value.id}/rank-tracking/fetch`,
      {
        method: 'POST',
        headers: authHeaders(),
      },
    )
    await loadKeywords()
    const updated = typeof res.updated === 'number' ? res.updated : 0
    refreshNotice.value = res.message || `Refreshed rankings for ${updated} keyword${updated === 1 ? '' : 's'}.`
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    refreshError.value = err?.data?.message ?? err?.message ?? 'Failed to refresh rankings.'
  } finally {
    refreshLoading.value = false
  }
}

async function removeKeyword(id: string) {
  if (!site.value) return
  deleteLoading.value = id
  try {
    await $fetch(`/api/sites/${site.value.id}/rank-tracking/keyword/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    await loadKeywords()
  } finally {
    deleteLoading.value = null
  }
}

async function init() {
  pending.value = true
  try {
    await loadSite()
    if (site.value) {
      await Promise.all([loadKeywords(), loadRankConfig(), loadGoogleStatus()])
    }
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>
