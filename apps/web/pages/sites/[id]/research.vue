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
        <h1 class="text-2xl font-semibold text-surface-900">Research</h1>
        <p class="mt-1 text-sm text-surface-500">
          Discover keywords from a seed topic (Claude) or pull ranked keywords for any domain (DataForSEO Labs).
        </p>
      </div>

      <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-semibold transition"
            :class="researchMode === 'keyword'
              ? 'bg-primary-600 text-white'
              : 'border border-surface-300 bg-white text-surface-700 hover:bg-surface-50'"
            @click="researchMode = 'keyword'"
          >
            By keyword
          </button>
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-semibold transition"
            :class="researchMode === 'domain'
              ? 'bg-primary-600 text-white'
              : 'border border-surface-300 bg-white text-surface-700 hover:bg-surface-50'"
            @click="researchMode = 'domain'"
          >
            By domain
          </button>
        </div>

        <form
          v-if="researchMode === 'keyword'"
          class="flex flex-col gap-3 sm:flex-row sm:items-end"
          @submit.prevent="runResearch"
        >
          <div class="min-w-[260px] flex-1">
            <label for="seed-keyword" class="mb-1 block text-xs font-medium uppercase tracking-wide text-surface-500">
              Keyword/topic
            </label>
            <input
              id="seed-keyword"
              v-model="seedKeyword"
              type="text"
              class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="e.g. commercial cleaning kansas city"
            />
          </div>
          <button
            type="submit"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="researchLoading || !seedKeyword.trim()"
          >
            {{ researchLoading ? 'Researching…' : 'Run research' }}
          </button>
        </form>

        <form
          v-else
          class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          @submit.prevent="runDomainResearch"
        >
          <div class="min-w-[260px] flex-1">
            <label for="target-domain" class="mb-1 block text-xs font-medium uppercase tracking-wide text-surface-500">
              Domain
            </label>
            <input
              id="target-domain"
              v-model="targetDomain"
              type="text"
              class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="e.g. competitor.com"
            />
            <p class="mt-1 text-xs text-surface-500">
              Organic keywords this domain ranks for (US, English). Uses DataForSEO Labs.
            </p>
          </div>
          <div class="w-full sm:w-36">
            <label for="domain-limit" class="mb-1 block text-xs font-medium uppercase tracking-wide text-surface-500">
              Max results
            </label>
            <select
              id="domain-limit"
              v-model.number="domainLimit"
              class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option :value="50">50</option>
              <option :value="100">100</option>
              <option :value="250">250</option>
              <option :value="500">500</option>
            </select>
          </div>
          <button
            type="submit"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="domainResearchLoading || !targetDomain.trim()"
          >
            {{ domainResearchLoading ? 'Fetching…' : 'Fetch keywords' }}
          </button>
        </form>
        <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
        <p v-if="latestResearchUpdatedAt" class="mt-2 text-xs text-surface-500">Last updated {{ formatDate(latestResearchUpdatedAt) }}</p>
      </section>

      <section
        v-for="item in researchItems"
        :key="researchKey(item)"
        class="mb-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm"
      >
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-lg font-medium text-surface-900">{{ researchTitle(item) }}</h2>
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="isDomainResearch(item)
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-sky-100 text-sky-700'"
              >
                {{ isDomainResearch(item) ? 'Domain' : 'Keyword' }}
              </span>
            </div>
            <p class="text-xs text-surface-500">
              Updated {{ formatDate(item.updatedAt) }}
              <template v-if="isDomainResearch(item) && item.totalKeywordCount">
                · {{ item.domainKeywords?.length ?? 0 }} shown
                <template v-if="item.totalKeywordCount > (item.domainKeywords?.length ?? 0)">
                  of {{ item.totalKeywordCount.toLocaleString() }} total
                </template>
              </template>
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
            @click="toggleResearchModule(item)"
          >
            {{ isResearchModuleCollapsed(item) ? 'Expand' : 'Collapse' }}
          </button>
        </div>

        <div v-if="!isResearchModuleCollapsed(item)">
          <template v-if="!isDomainResearch(item)">
            <div class="mb-5">
              <h3 class="mb-2 text-base font-medium text-surface-900">
                Competitor domains for {{ item.seedKeyword }}
              </h3>
              <div v-if="item.competitors?.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div v-for="comp in item.competitors" :key="comp.domain" class="rounded-lg border border-surface-200 bg-surface-50 p-3">
                  <p class="text-sm font-semibold text-surface-900">{{ comp.domain }}</p>
                  <p v-if="comp.reason" class="mt-1 text-xs text-surface-600">{{ comp.reason }}</p>
                </div>
              </div>
              <p v-else class="text-sm text-surface-500">No competitors for this seed keyword yet.</p>
            </div>
          </template>

          <div>
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 class="text-base font-medium text-surface-900">
                <template v-if="isDomainResearch(item)">
                  Ranked keywords for {{ item.targetDomain }}
                </template>
                <template v-else>
                  Shared keywords across competitors for {{ item.seedKeyword }}
                </template>
              </h3>
              <button
                type="button"
                class="rounded-lg border border-primary-600 bg-white px-4 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50 disabled:opacity-50"
                :disabled="addToRankTrackingLoading || selectedKeywordCountFor(item) === 0"
                @click="addSelectedToRankTracking(item)"
              >
                {{ addToRankTrackingLoading ? 'Adding…' : `Add selected to rank tracking (${selectedKeywordCountFor(item)})` }}
              </button>
            </div>
            <p v-if="addToRankTrackingMessageBySeed[researchKey(item)]" class="mb-3 text-sm text-emerald-700">
              {{ addToRankTrackingMessageBySeed[researchKey(item)] }}
            </p>
            <p v-if="addToRankTrackingErrorBySeed[researchKey(item)]" class="mb-3 text-sm text-red-600">
              {{ addToRankTrackingErrorBySeed[researchKey(item)] }}
            </p>
            <div v-if="keywordRowsFor(item).length" class="overflow-x-auto rounded-lg border border-surface-200">
              <table class="min-w-full divide-y divide-surface-200 text-left text-sm">
                <thead class="bg-surface-50">
                  <tr>
                    <th class="w-12 px-4 py-3 font-medium text-surface-700">
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                        :checked="allSelectableKeywordsSelectedFor(item)"
                        :disabled="selectableKeywordsFor(item).length === 0"
                        aria-label="Select all keywords"
                        @change="toggleSelectAllKeywordsFor(item)"
                      />
                    </th>
                    <th class="px-4 py-3 font-medium text-surface-700">Keyword</th>
                    <th v-if="isDomainResearch(item)" class="px-4 py-3 font-medium text-surface-700">Position</th>
                    <th v-if="isDomainResearch(item)" class="px-4 py-3 font-medium text-surface-700">Volume</th>
                    <th v-if="!isDomainResearch(item)" class="px-4 py-3 font-medium text-surface-700">Why it matters</th>
                    <th v-if="isDomainResearch(item)" class="px-4 py-3 font-medium text-surface-700">Ranking URL</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-200 bg-white">
                  <tr v-for="row in keywordRowsFor(item)" :key="row.keyword">
                    <td class="px-4 py-2">
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                        :checked="selectedKeywordSet.has(normalizeKeyword(row.keyword))"
                        :disabled="existingRankKeywordSet.has(normalizeKeyword(row.keyword))"
                        @change="toggleKeywordSelection(row.keyword)"
                      />
                    </td>
                    <td class="px-4 py-2 font-medium text-surface-900">
                      <div class="flex items-center gap-2">
                        <span>{{ row.keyword }}</span>
                        <span
                          v-if="existingRankKeywordSet.has(normalizeKeyword(row.keyword))"
                          class="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                        >
                          Added
                        </span>
                      </div>
                    </td>
                    <td v-if="isDomainResearch(item)" class="px-4 py-2 text-surface-900">
                      <span v-if="row.position" class="font-semibold text-primary-600">#{{ row.position }}</span>
                      <span v-else class="text-surface-400">—</span>
                    </td>
                    <td v-if="isDomainResearch(item)" class="px-4 py-2 text-surface-900">
                      <span v-if="row.searchVolume != null">{{ row.searchVolume.toLocaleString() }}</span>
                      <span v-else class="text-surface-400">—</span>
                    </td>
                    <td v-if="!isDomainResearch(item)" class="px-4 py-2 text-surface-600">{{ row.reason || '—' }}</td>
                    <td v-if="isDomainResearch(item)" class="max-w-[280px] px-4 py-2 text-surface-600">
                      <a
                        v-if="row.url"
                        :href="row.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="truncate text-primary-600 hover:underline"
                      >
                        {{ row.url }}
                      </a>
                      <span v-else class="text-surface-400">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-surface-500">
              <template v-if="isDomainResearch(item)">No ranked keywords returned for this domain.</template>
              <template v-else>No shared keywords for this seed keyword yet.</template>
            </p>
          </div>
        </div>
      </section>
      <section v-if="researchItems.length === 0" class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-surface-500">No research modules yet. Run keyword or domain research above to create one.</p>
      </section>
    </template>

    <div v-else class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-500">Site not found.</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-primary-600 hover:underline">Back to Dashboard</NuxtLink>
    </div>
  </SiteIntegrationShell>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import { getSite } from '~/services/sites'

definePageMeta({ layout: 'default' })

interface CompetitorItem {
  domain: string
  reason?: string
}
interface SharedKeywordItem {
  keyword: string
  reason?: string
}
interface DomainKeywordItem {
  keyword: string
  position: number
  searchVolume?: number | null
  url?: string
}
interface KeywordRow {
  keyword: string
  reason?: string
  position?: number
  searchVolume?: number | null
  url?: string
}
interface SiteResearch {
  researchType?: 'keyword' | 'domain'
  seedKeyword: string
  targetDomain?: string
  competitors: CompetitorItem[]
  sharedKeywords: SharedKeywordItem[]
  domainKeywords?: DomainKeywordItem[]
  totalKeywordCount?: number
  updatedAt: string
}
interface RankKeyword {
  keyword: string
}

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()

const site = ref<SiteRecord | null>(null)
const pending = ref(true)
const researchMode = ref<'keyword' | 'domain'>('keyword')
const researchLoading = ref(false)
const domainResearchLoading = ref(false)
const error = ref('')
const researchItems = ref<SiteResearch[]>([])
const seedKeyword = ref('')
const targetDomain = ref('')
const domainLimit = ref(100)
const selectedKeywords = ref<string[]>([])
const existingRankKeywords = ref<string[]>([])
const addToRankTrackingLoading = ref(false)
const addToRankTrackingErrorBySeed = ref<Record<string, string>>({})
const addToRankTrackingMessageBySeed = ref<Record<string, string>>({})
const collapsedResearchSeeds = ref<string[]>([])

const selectedKeywordSet = computed(() => new Set(selectedKeywords.value.map((k) => normalizeKeyword(k))))
const existingRankKeywordSet = computed(() => new Set(existingRankKeywords.value.map((k) => normalizeKeyword(k))))
const latestResearchUpdatedAt = computed(() => researchItems.value[0]?.updatedAt || '')
function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
}

function isDomainResearch(item: SiteResearch): boolean {
  return item.researchType === 'domain' || (!!item.targetDomain && Array.isArray(item.domainKeywords))
}

function researchTitle(item: SiteResearch): string {
  if (isDomainResearch(item)) return item.targetDomain || 'Domain research'
  return item.seedKeyword
}

function keywordRowsFor(item: SiteResearch): KeywordRow[] {
  if (isDomainResearch(item)) {
    return (item.domainKeywords ?? []).map((row) => ({
      keyword: row.keyword,
      position: row.position,
      searchVolume: row.searchVolume,
      url: row.url,
    }))
  }
  return (item.sharedKeywords ?? []).map((row) => ({
    keyword: row.keyword,
    reason: row.reason,
  }))
}

function researchKey(item: SiteResearch): string {
  if (isDomainResearch(item)) {
    return `domain:${normalizeDomain(item.targetDomain || '')}`
  }
  return normalizeKeyword(item.seedKeyword)
}

function isResearchModuleCollapsed(item: SiteResearch): boolean {
  return collapsedResearchSeeds.value.includes(researchKey(item))
}

function toggleResearchModule(item: SiteResearch) {
  const key = researchKey(item)
  if (!key) return
  if (collapsedResearchSeeds.value.includes(key)) {
    collapsedResearchSeeds.value = collapsedResearchSeeds.value.filter((k) => k !== key)
  } else {
    collapsedResearchSeeds.value = [...collapsedResearchSeeds.value, key]
  }
}

function toggleKeywordSelection(keyword: string) {
  const normalized = normalizeKeyword(keyword)
  if (!normalized || existingRankKeywordSet.value.has(normalized)) return
  const next = [...selectedKeywords.value]
  const idx = next.findIndex((k) => normalizeKeyword(k) === normalized)
  if (idx >= 0) next.splice(idx, 1)
  else next.push(keyword.trim())
  selectedKeywords.value = next
}

function selectableKeywordsFor(item: SiteResearch): string[] {
  return keywordRowsFor(item)
    .map((entry) => entry.keyword.trim())
    .filter((keyword) => keyword.length > 0)
    .filter((keyword) => !existingRankKeywordSet.value.has(normalizeKeyword(keyword)))
}

function allSelectableKeywordsSelectedFor(item: SiteResearch): boolean {
  const selectable = selectableKeywordsFor(item)
  if (!selectable.length) return false
  return selectable.every((keyword) => selectedKeywordSet.value.has(normalizeKeyword(keyword)))
}

function selectedKeywordCountFor(item: SiteResearch): number {
  const selectableSet = new Set(selectableKeywordsFor(item).map((k) => normalizeKeyword(k)))
  let count = 0
  for (const selected of selectedKeywords.value) {
    if (selectableSet.has(normalizeKeyword(selected))) count += 1
  }
  return count
}

function toggleSelectAllKeywordsFor(item: SiteResearch) {
  const selectableKeywords = selectableKeywordsFor(item)
  if (allSelectableKeywordsSelectedFor(item)) {
    const selectableSet = new Set(selectableKeywords.map((k) => normalizeKeyword(k)))
    selectedKeywords.value = selectedKeywords.value.filter((k) => !selectableSet.has(normalizeKeyword(k)))
    return
  }
  const byNormalized = new Map<string, string>()
  for (const keyword of selectedKeywords.value) {
    const normalized = normalizeKeyword(keyword)
    if (normalized) byNormalized.set(normalized, keyword.trim())
  }
  for (const keyword of selectableKeywords) {
    const normalized = normalizeKeyword(keyword)
    if (normalized && !byNormalized.has(normalized)) byNormalized.set(normalized, keyword)
  }
  selectedKeywords.value = [...byNormalized.values()]
}

function syncSelectedKeywordsWithResearch() {
  const available = new Set(
    researchItems.value.flatMap((item) => keywordRowsFor(item)).map((item) => normalizeKeyword(item.keyword))
  )
  selectedKeywords.value = selectedKeywords.value.filter((k) => available.has(normalizeKeyword(k)))
}

async function loadExistingRankKeywords() {
  if (!site.value) return
  try {
    const res = await $fetch<{ keywords: RankKeyword[] }>(
      `/api/sites/${site.value.id}/rank-tracking/list`,
      { headers: authHeaders() }
    )
    existingRankKeywords.value = (res.keywords ?? []).map((k) => k.keyword || '').filter((k) => k.trim().length > 0)
  } catch {
    existingRankKeywords.value = []
  }
}

async function loadResearch() {
  if (!site.value) return
  error.value = ''
  try {
    const res = await $fetch<{ research: SiteResearch | null; researchItems?: SiteResearch[] }>(
      `/api/sites/${site.value.id}/research`,
      { headers: authHeaders() }
    )
    const items = Array.isArray(res.researchItems)
      ? res.researchItems
      : (res.research ? [res.research] : [])
    researchItems.value = [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    if (!seedKeyword.value && researchItems.value[0]?.seedKeyword) seedKeyword.value = researchItems.value[0].seedKeyword
    syncSelectedKeywordsWithResearch()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Could not load research data.'
  }
}

async function runResearch() {
  if (!site.value || !seedKeyword.value.trim()) return
  researchLoading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ research: SiteResearch; researchItems?: SiteResearch[] }>(`/api/sites/${site.value.id}/research`, {
      method: 'POST',
      body: { seedKeyword: seedKeyword.value.trim() },
      headers: authHeaders(),
    })
    const items = Array.isArray(res.researchItems) ? res.researchItems : [res.research]
    researchItems.value = [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    syncSelectedKeywordsWithResearch()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Research failed.'
  } finally {
    researchLoading.value = false
  }
}

async function runDomainResearch() {
  if (!site.value || !targetDomain.value.trim()) return
  domainResearchLoading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ research: SiteResearch; researchItems?: SiteResearch[] }>(
      `/api/sites/${site.value.id}/research/domain`,
      {
        method: 'POST',
        body: { targetDomain: targetDomain.value.trim(), limit: domainLimit.value },
        headers: authHeaders(),
      },
    )
    const items = Array.isArray(res.researchItems) ? res.researchItems : [res.research]
    researchItems.value = [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    syncSelectedKeywordsWithResearch()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Domain keyword research failed.'
  } finally {
    domainResearchLoading.value = false
  }
}

async function addSelectedToRankTracking(item: SiteResearch) {
  if (!site.value) return
  const key = researchKey(item)
  addToRankTrackingErrorBySeed.value[key] = ''
  addToRankTrackingMessageBySeed.value[key] = ''
  const moduleKeywordSet = new Set(keywordRowsFor(item).map((k) => normalizeKeyword(k.keyword)))

  const candidates = selectedKeywords.value
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
    .filter((k) => moduleKeywordSet.has(normalizeKeyword(k)))
    .filter((k) => !existingRankKeywordSet.value.has(normalizeKeyword(k)))

  if (!candidates.length) {
    addToRankTrackingMessageBySeed.value[key] = 'All selected keywords in this module are already in rank tracking.'
    return
  }

  addToRankTrackingLoading.value = true
  try {
    const addRes = await $fetch<{ ranksFetched?: number; rankFetchPending?: boolean }>(
      `/api/sites/${site.value.id}/rank-tracking/list`,
      {
        method: 'POST',
        body: { keywords: candidates },
        headers: authHeaders(),
      },
    )
    await loadExistingRankKeywords()
    selectedKeywords.value = selectedKeywords.value.filter(
      (k) => !existingRankKeywordSet.value.has(normalizeKeyword(k))
    )
    let msg = `Added ${candidates.length} keyword${candidates.length === 1 ? '' : 's'} to rank tracking.`
    if (addRes.rankFetchPending) {
      msg += ' Rank positions are fetching in the background; refresh rank tracking in a minute if results look empty.'
    } else if (typeof addRes.ranksFetched === 'number' && addRes.ranksFetched > 0) {
      msg += ' Current rankings fetched.'
    }
    addToRankTrackingMessageBySeed.value[key] = msg
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    addToRankTrackingErrorBySeed.value[key] = err?.data?.message ?? err?.message ?? 'Failed to add keywords to rank tracking.'
  } finally {
    addToRankTrackingLoading.value = false
  }
}

async function init() {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
    if (site.value) {
      if (!targetDomain.value && site.value.domain) {
        targetDomain.value = normalizeDomain(site.value.domain)
      }
      await Promise.all([loadResearch(), loadExistingRankKeywords()])
    }
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
watch(researchMode, (mode) => {
  if (mode === 'domain' && !targetDomain.value.trim() && site.value?.domain) {
    targetDomain.value = normalizeDomain(site.value.domain)
  }
})
</script>

