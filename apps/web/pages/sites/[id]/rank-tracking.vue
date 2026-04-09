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
        <h1 class="text-2xl font-semibold text-surface-900">Rank tracking</h1>
        <p class="mt-1 text-sm text-surface-500">
          Track where {{ site.domain }} ranks for your keywords (Google Organic, US). Data from DataForSEO SERP API. Max 100 keywords per site.
        </p>
        <p class="mt-2 text-sm text-surface-600">
          Positions update automatically when you add keywords, then every Friday at midnight (configurable timezone, default US Central). No manual refresh needed.
        </p>
        <p v-if="loadError" class="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {{ loadError }}
        </p>
      </div>

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
              {{ remainingKeywords }} of {{ maxKeywords }} slots available.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="submit"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
              :disabled="addLoading || keywords.length >= maxKeywords"
            >
              {{ addLoading ? 'Adding…' : 'Add keywords' }}
            </button>
          </div>
        </form>
        <p v-if="addNotice" class="mt-2 text-sm text-emerald-700">{{ addNotice }}</p>
        <p v-if="addError" class="mt-2 text-sm text-red-600">{{ addError }}</p>
        <p v-if="keywords.length >= maxKeywords" class="mt-2 text-sm text-amber-700">
          Maximum {{ maxKeywords }} keywords. Remove one to add more.
        </p>
      </section>

      <div class="mb-4">
        <h2 class="text-lg font-medium text-surface-900">Keywords &amp; rankings</h2>
        <p v-if="keywords.length && latestRankingsFetchedLabel" class="mt-1 text-sm text-surface-500">
          Last rankings update: {{ latestRankingsFetchedLabel }}
        </p>
        <p v-else-if="keywords.length" class="mt-1 text-sm text-surface-500">No rankings fetched yet.</p>
      </div>

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
                  title="Monthly search volume when added from Keyword research (DataForSEO), else Search Console impressions (28d) when connected."
                  @click="changeSort('volume')"
                >
                  Volume
                  <span v-if="sortKey === 'volume'" class="ml-1 text-[10px] align-middle">
                    {{ sortDir === 'asc' ? '▲' : '▼' }}
                  </span>
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">URL</th>
                <th class="px-4 py-3 w-20 text-right text-xs font-medium uppercase text-surface-500">Remove</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-200 bg-white">
              <tr v-for="kw in sortedKeywords" :key="kw.id" class="hover:bg-surface-50/50">
                <td class="px-4 py-3 text-sm font-medium text-surface-900">{{ kw.keyword }}</td>
                <td class="px-4 py-3 text-sm">
                  <template v-if="kw.last_result_json?.error">
                    <span class="text-amber-700" :title="kw.last_result_json.error">—</span>
                  </template>
                  <template v-else-if="kw.last_result_json && typeof kw.last_result_json.position === 'number'">
                    <span class="font-semibold text-primary-600">#{{ kw.last_result_json.position }}</span>
                  </template>
                  <span v-else class="text-surface-400">—</span>
                </td>
                <td class="px-4 py-3 text-sm">
                  <span v-if="keywordVolumeDisplay(kw) != null" class="font-medium text-surface-900">
                    {{ keywordVolumeDisplay(kw)!.toLocaleString() }}
                  </span>
                  <span v-else class="text-surface-400">—</span>
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
    </template>

    <div v-else class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-500">Site not found.</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-primary-600 hover:underline">Back to Dashboard</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import type { GoogleStatusResponse } from '~/composables/useGoogleIntegration'
import { getSite } from '~/services/sites'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'

interface RankKeyword {
  id: string
  site: string
  keyword: string
  search_volume?: number | null
  last_result_json?: {
    position?: number
    rankAbsolute?: number
    url?: string
    title?: string
    description?: string
    fetchedAt?: string
    error?: string
  } | null
  created: string
  updated: string
}
const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()
const { getStatus, getGscReportQueries } = useGoogleIntegration()

const site = ref<SiteRecord | null>(null)
const keywords = ref<RankKeyword[]>([])
const maxKeywords = ref(100)
const pending = ref(true)
const newKeywordsRaw = ref('')
const addLoading = ref(false)
const addError = ref('')
const addNotice = ref('')
const loadError = ref('')
const deleteLoading = ref<string | null>(null)
const googleStatus = ref<GoogleStatusResponse | null>(null)
const volumeByKeyword = ref<Record<string, number>>({})
const volumeLoading = ref(false)
const volumeError = ref('')
const sortKey = ref<'keyword' | 'position' | 'volume'>('keyword')
const sortDir = ref<'asc' | 'desc'>('asc')
const hasGsc = computed(
  () => !!googleStatus.value?.connected && !!googleStatus.value?.selectedSearchConsoleSite,
)

const remainingKeywords = computed(() =>
  Math.max(0, maxKeywords.value - keywords.value.length),
)

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

const sortedKeywords = computed(() => {
  const list = [...keywords.value]
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1

  return list.sort((a, b) => {
    if (key === 'keyword') {
      return a.keyword.localeCompare(b.keyword) * dir
    }

    if (key === 'position') {
      const posA = typeof a.last_result_json?.position === 'number' ? a.last_result_json.position : Number.POSITIVE_INFINITY
      const posB = typeof b.last_result_json?.position === 'number' ? b.last_result_json.position : Number.POSITIVE_INFINITY
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

function rankingUrlTooltip(json: NonNullable<RankKeyword['last_result_json']>): string {
  const lines: string[] = []
  if (json.url) lines.push(json.url)
  if (json.title) lines.push(json.title)
  return lines.join('\n')
}

function normaliseKeyword(value: string): string {
  return value.trim().toLowerCase()
}

function getKeywordVolume(keyword: string): number | null {
  const vol = volumeByKeyword.value[normaliseKeyword(keyword)]
  return typeof vol === 'number' ? vol : null
}

/** Prefer DataForSEO monthly volume saved on the row; fall back to GSC query impressions. */
function keywordVolumeDisplay(kw: RankKeyword): number | null {
  if (typeof kw.search_volume === 'number' && !Number.isNaN(kw.search_volume)) return kw.search_volume
  return getKeywordVolume(kw.keyword)
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

function dateRangeFromPreset(preset: 'last_7_days' | 'last_28_days' | 'last_90_days'): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  if (preset === 'last_7_days') start.setDate(end.getDate() - 6)
  else if (preset === 'last_90_days') start.setDate(end.getDate() - 89)
  else start.setDate(end.getDate() - 27)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

async function loadKeywordVolumes() {
  if (!site.value || !hasGsc.value) return
  volumeLoading.value = true
  volumeError.value = ''
  volumeByKeyword.value = {}
  try {
    const { startDate, endDate } = dateRangeFromPreset('last_28_days')
    const res = await getGscReportQueries(site.value.id, startDate, endDate)
    const map: Record<string, number> = {}
    for (const row of res.rows ?? []) {
      const key = normaliseKeyword(row.query)
      if (!key) continue
      const current = map[key] ?? 0
      map[key] = current + (row.impressions ?? 0)
    }
    volumeByKeyword.value = map
  } catch (e) {
    volumeError.value = e instanceof Error ? e.message : 'Failed to load search volume from Search Console.'
  } finally {
    volumeLoading.value = false
  }
}

async function loadKeywords() {
  if (!site.value) return
  loadError.value = ''
  try {
    const res = await $fetch<{ keywords: RankKeyword[]; maxKeywords: number }>(
      `/api/sites/${site.value.id}/rank-tracking/list`,
      { headers: authHeaders() }
    )
    keywords.value = res.keywords
    maxKeywords.value = res.maxKeywords
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
    addError.value = `Maximum ${maxKeywords.value} keywords. Remove one to add more.`
    return
  }

  const toSend = unique.slice(0, available)
  addLoading.value = true
  try {
    const res = await $fetch<{ ranksFetched?: number; createdCount?: number }>(
      `/api/sites/${site.value.id}/rank-tracking/list`,
      {
        method: 'POST',
        body: { keywords: toSend },
        headers: authHeaders(),
      }
    )
    newKeywordsRaw.value = ''
    await loadKeywords()
    const n = typeof res.ranksFetched === 'number' ? res.ranksFetched : 0
    if (n > 0) {
      addNotice.value = `Fetched current rankings for ${n} new keyword${n === 1 ? '' : 's'}.`
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    addError.value = err?.data?.message ?? err?.message ?? 'Failed to add keywords'
  } finally {
    addLoading.value = false
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
      await loadKeywords()
      await loadGoogleStatus()
      await loadKeywordVolumes()
    }
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>
