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
        <h1 class="text-2xl font-semibold text-surface-900">Research</h1>
        <p class="mt-1 text-sm text-surface-500">
          Build competitor ideas from a seed keyword, then extract shared keywords with Claude.
        </p>
      </div>

      <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="mb-3 text-lg font-medium text-surface-900">Seed keyword</h2>
        <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="runResearch">
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
            <h2 class="text-lg font-medium text-surface-900">{{ item.seedKeyword }}</h2>
            <p class="text-xs text-surface-500">Updated {{ formatDate(item.updatedAt) }}</p>
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

          <div>
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 class="text-base font-medium text-surface-900">
                Shared keywords across competitors for {{ item.seedKeyword }}
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
            <div v-if="item.sharedKeywords?.length" class="overflow-x-auto rounded-lg border border-surface-200">
              <table class="min-w-full divide-y divide-surface-200 text-left text-sm">
                <thead class="bg-surface-50">
                  <tr>
                    <th class="w-12 px-4 py-3 font-medium text-surface-700">
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                        :checked="allSelectableKeywordsSelectedFor(item)"
                        :disabled="selectableSharedKeywordsFor(item).length === 0"
                        aria-label="Select all shared keywords"
                        @change="toggleSelectAllKeywordsFor(item)"
                      />
                    </th>
                    <th class="px-4 py-3 font-medium text-surface-700">Keyword</th>
                    <th class="px-4 py-3 font-medium text-surface-700">Why it matters</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-200 bg-white">
                  <tr v-for="shared in item.sharedKeywords" :key="shared.keyword">
                    <td class="px-4 py-2">
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                        :checked="selectedKeywordSet.has(normalizeKeyword(shared.keyword))"
                        :disabled="existingRankKeywordSet.has(normalizeKeyword(shared.keyword))"
                        @change="toggleKeywordSelection(shared.keyword)"
                      />
                    </td>
                    <td class="px-4 py-2 font-medium text-surface-900">
                      <div class="flex items-center gap-2">
                        <span>{{ shared.keyword }}</span>
                        <span
                          v-if="existingRankKeywordSet.has(normalizeKeyword(shared.keyword))"
                          class="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                        >
                          Added
                        </span>
                      </div>
                    </td>
                    <td class="px-4 py-2 text-surface-600">{{ shared.reason || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-surface-500">No shared keywords for this seed keyword yet.</p>
          </div>
        </div>
      </section>
      <section v-if="researchItems.length === 0" class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-surface-500">No research modules yet. Run research with a seed keyword to create one.</p>
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
interface SiteResearch {
  seedKeyword: string
  competitors: CompetitorItem[]
  sharedKeywords: SharedKeywordItem[]
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
const researchLoading = ref(false)
const error = ref('')
const researchItems = ref<SiteResearch[]>([])
const seedKeyword = ref('')
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

function researchKey(item: SiteResearch): string {
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

function selectableSharedKeywordsFor(item: SiteResearch): string[] {
  return (item.sharedKeywords ?? [])
    .map((entry) => entry.keyword.trim())
    .filter((keyword) => keyword.length > 0)
    .filter((keyword) => !existingRankKeywordSet.value.has(normalizeKeyword(keyword)))
}

function allSelectableKeywordsSelectedFor(item: SiteResearch): boolean {
  const selectable = selectableSharedKeywordsFor(item)
  if (!selectable.length) return false
  return selectable.every((keyword) => selectedKeywordSet.value.has(normalizeKeyword(keyword)))
}

function selectedKeywordCountFor(item: SiteResearch): number {
  const selectableSet = new Set(selectableSharedKeywordsFor(item).map((k) => normalizeKeyword(k)))
  let count = 0
  for (const selected of selectedKeywords.value) {
    if (selectableSet.has(normalizeKeyword(selected))) count += 1
  }
  return count
}

function toggleSelectAllKeywordsFor(item: SiteResearch) {
  const selectableKeywords = selectableSharedKeywordsFor(item)
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
    researchItems.value.flatMap((item) => item.sharedKeywords ?? []).map((item) => normalizeKeyword(item.keyword))
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

async function addSelectedToRankTracking(item: SiteResearch) {
  if (!site.value) return
  const key = researchKey(item)
  addToRankTrackingErrorBySeed.value[key] = ''
  addToRankTrackingMessageBySeed.value[key] = ''
  const moduleKeywordSet = new Set((item.sharedKeywords ?? []).map((k) => normalizeKeyword(k.keyword)))

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
    await $fetch(`/api/sites/${site.value.id}/rank-tracking/list`, {
      method: 'POST',
      body: { keywords: candidates },
      headers: authHeaders(),
    })
    await loadExistingRankKeywords()
    selectedKeywords.value = selectedKeywords.value.filter(
      (k) => !existingRankKeywordSet.value.has(normalizeKeyword(k))
    )
    addToRankTrackingMessageBySeed.value[key] = `Added ${candidates.length} keyword${candidates.length === 1 ? '' : 's'} to rank tracking.`
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
      await Promise.all([loadResearch(), loadExistingRankKeywords()])
    }
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>

