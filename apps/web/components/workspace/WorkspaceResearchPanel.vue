<template>
  <div>
    <ProspectAuditPanel />

    <div class="mb-6 border-t border-slate-800 pt-8">
      <h2 class="text-lg font-semibold text-white">Keyword & domain research</h2>
      <p class="mt-1 max-w-2xl text-sm text-slate-400">
        Dig deeper on a topic or pull ranked keywords. Save selections to a Workspace board card.
      </p>
    </div>

    <section class="mb-8 rounded-xl border border-slate-700/70 bg-slate-900/50 p-6 shadow-sm">
      <div class="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-semibold transition"
          :class="researchMode === 'keyword'
            ? 'bg-primary-600 text-white'
            : 'border border-slate-600 bg-slate-800/60 text-slate-200 hover:bg-slate-800'"
          @click="researchMode = 'keyword'"
        >
          By keyword
        </button>
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-semibold transition"
          :class="researchMode === 'domain'
            ? 'bg-primary-600 text-white'
            : 'border border-slate-600 bg-slate-800/60 text-slate-200 hover:bg-slate-800'"
          @click="researchMode = 'domain'"
        >
          By domain
        </button>
      </div>

      <form
        v-if="researchMode === 'keyword'"
        class="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end"
        @submit.prevent="runResearch"
      >
        <div class="min-w-[220px] flex-1">
          <label for="ws-seed-keyword" class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Keyword / topic
          </label>
          <input
            id="ws-seed-keyword"
            v-model="seedKeyword"
            type="text"
            class="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="e.g. commercial cleaning kansas city"
          />
        </div>
        <div class="min-w-[220px] flex-1">
          <label for="ws-context-domain" class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Related domain <span class="normal-case text-slate-600">(optional)</span>
          </label>
          <input
            id="ws-context-domain"
            v-model="contextDomain"
            type="text"
            class="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="e.g. prospect.com"
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
          <label for="ws-target-domain" class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Domain
          </label>
          <input
            id="ws-target-domain"
            v-model="targetDomain"
            type="text"
            class="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="e.g. prospect.com"
          />
          <p class="mt-1 text-xs text-slate-500">
            Organic keywords this domain ranks for (US, English). Uses DataForSEO Labs.
          </p>
        </div>
        <div class="w-full sm:w-36">
          <label for="ws-domain-limit" class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Max results
          </label>
          <select
            id="ws-domain-limit"
            v-model.number="domainLimit"
            class="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
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
      <p v-if="error" class="mt-3 text-sm text-rose-300">{{ error }}</p>
      <p v-if="latestResearchUpdatedAt" class="mt-2 text-xs text-slate-500">
        Last updated {{ formatDate(latestResearchUpdatedAt) }}
      </p>
    </section>

    <div v-if="pending" class="py-12 text-center text-slate-500">Loading research…</div>

    <template v-else>
      <section
        v-for="item in researchItems"
        :key="researchKey(item)"
        class="mb-6 rounded-xl border border-slate-700/70 bg-slate-900/50 p-6 shadow-sm"
      >
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-lg font-medium text-white">{{ researchTitle(item) }}</h3>
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="isDomainResearch(item)
                  ? 'bg-violet-500/20 text-violet-200'
                  : 'bg-sky-500/20 text-sky-200'"
              >
                {{ isDomainResearch(item) ? 'Domain' : 'Keyword' }}
              </span>
            </div>
            <p class="text-xs text-slate-500">
              Updated {{ formatDate(item.updatedAt) }}
              <template v-if="!isDomainResearch(item) && item.contextDomain">
                · related {{ item.contextDomain }}
              </template>
              <template v-if="isDomainResearch(item) && item.totalKeywordCount">
                · {{ item.domainKeywords?.length ?? 0 }} shown
                <template v-if="item.totalKeywordCount > (item.domainKeywords?.length ?? 0)">
                  of {{ item.totalKeywordCount.toLocaleString() }} total
                </template>
              </template>
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-lg border border-primary-500/50 bg-primary-600/15 px-3 py-2 text-sm font-semibold text-primary-200 hover:bg-primary-600/25"
              @click="openSaveModal(item)"
            >
              Save to board
              <template v-if="selectedKeywordCountFor(item)">
                ({{ selectedKeywordCountFor(item) }} selected)
              </template>
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
              @click="toggleResearchModule(item)"
            >
              {{ isResearchModuleCollapsed(item) ? 'Expand' : 'Collapse' }}
            </button>
          </div>
        </div>

        <div v-if="!isResearchModuleCollapsed(item)">
          <template v-if="!isDomainResearch(item)">
            <div class="mb-5">
              <h4 class="mb-2 text-base font-medium text-white">
                Competitor domains for {{ item.seedKeyword }}
              </h4>
              <div v-if="item.competitors?.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div
                  v-for="comp in item.competitors"
                  :key="comp.domain"
                  class="rounded-lg border border-slate-700 bg-slate-950/50 p-3"
                >
                  <p class="text-sm font-semibold text-white">{{ comp.domain }}</p>
                  <p v-if="comp.reason" class="mt-1 text-xs text-slate-400">{{ comp.reason }}</p>
                </div>
              </div>
              <p v-else class="text-sm text-slate-500">No competitors for this seed keyword yet.</p>
            </div>
          </template>

          <div>
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h4 class="text-base font-medium text-white">
                <template v-if="isDomainResearch(item)">
                  Ranked keywords for {{ item.targetDomain }}
                </template>
                <template v-else>
                  Shared keywords across competitors for {{ item.seedKeyword }}
                </template>
              </h4>
            </div>
            <div v-if="keywordRowsFor(item).length" class="overflow-x-auto rounded-lg border border-slate-700">
              <table class="min-w-full divide-y divide-slate-700 text-left text-sm">
                <thead class="bg-slate-950/70">
                  <tr>
                    <th class="w-12 px-4 py-3 font-medium text-slate-300">
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-slate-600 text-primary-600 focus:ring-primary-500"
                        :checked="allSelectableKeywordsSelectedFor(item)"
                        :disabled="selectableKeywordsFor(item).length === 0"
                        aria-label="Select all keywords"
                        @change="toggleSelectAllKeywordsFor(item)"
                      />
                    </th>
                    <th class="px-4 py-3 font-medium text-slate-300">Keyword</th>
                    <th v-if="isDomainResearch(item)" class="px-4 py-3 font-medium text-slate-300">Position</th>
                    <th v-if="isDomainResearch(item)" class="px-4 py-3 font-medium text-slate-300">Volume</th>
                    <th v-if="!isDomainResearch(item)" class="px-4 py-3 font-medium text-slate-300">Why it matters</th>
                    <th v-if="isDomainResearch(item)" class="px-4 py-3 font-medium text-slate-300">Ranking URL</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800 bg-slate-950/40">
                  <tr v-for="row in keywordRowsFor(item)" :key="row.keyword">
                    <td class="px-4 py-2">
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-slate-600 text-primary-600 focus:ring-primary-500"
                        :checked="selectedKeywordSet.has(normalizeKeyword(row.keyword))"
                        @change="toggleKeywordSelection(row.keyword)"
                      />
                    </td>
                    <td class="px-4 py-2 font-medium text-white">{{ row.keyword }}</td>
                    <td v-if="isDomainResearch(item)" class="px-4 py-2 text-slate-200">
                      <span v-if="row.position" class="font-semibold text-primary-300">#{{ row.position }}</span>
                      <span v-else class="text-slate-500">—</span>
                    </td>
                    <td v-if="isDomainResearch(item)" class="px-4 py-2 text-slate-200">
                      <span v-if="row.searchVolume != null">{{ row.searchVolume.toLocaleString() }}</span>
                      <span v-else class="text-slate-500">—</span>
                    </td>
                    <td v-if="!isDomainResearch(item)" class="px-4 py-2 text-slate-400">{{ row.reason || '—' }}</td>
                    <td v-if="isDomainResearch(item)" class="max-w-[280px] px-4 py-2 text-slate-400">
                      <a
                        v-if="row.url"
                        :href="row.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="truncate text-primary-300 hover:underline"
                      >
                        {{ row.url }}
                      </a>
                      <span v-else class="text-slate-500">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-slate-500">
              <template v-if="isDomainResearch(item)">No ranked keywords returned for this domain.</template>
              <template v-else>No shared keywords for this seed keyword yet.</template>
            </p>
          </div>
        </div>
      </section>

      <section
        v-if="researchItems.length === 0"
        class="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-5 py-10 text-center"
      >
        <p class="text-sm text-slate-400">
          No research yet. Run keyword or domain research above to evaluate a prospect, then save results to a board card.
        </p>
      </section>
    </template>

    <SaveResearchToBoardModal
      v-model="saveModalOpen"
      :item="saveItem"
      :selected-keywords="selectedKeywordsForSave"
    />
  </div>
</template>

<script setup lang="ts">
import {
  isDomainResearch,
  keywordRowsFor,
  normalizeDomain,
  normalizeKeyword,
  researchKey,
  researchTitle,
  type ProspectResearchItem,
} from '~/utils/prospectResearch'

const pb = usePocketbase()

const pending = ref(true)
const researchMode = ref<'keyword' | 'domain'>('domain')
const researchLoading = ref(false)
const domainResearchLoading = ref(false)
const error = ref('')
const researchItems = ref<ProspectResearchItem[]>([])
const seedKeyword = ref('')
const contextDomain = ref('')
const targetDomain = ref('')
const domainLimit = ref(100)
const selectedKeywords = ref<string[]>([])
const collapsedResearchSeeds = ref<string[]>([])
const saveModalOpen = ref(false)
const saveItem = ref<ProspectResearchItem | null>(null)

const selectedKeywordSet = computed(() => new Set(selectedKeywords.value.map((k) => normalizeKeyword(k))))
const latestResearchUpdatedAt = computed(() => researchItems.value[0]?.updatedAt || '')

const selectedKeywordsForSave = computed(() => {
  if (!saveItem.value) return []
  const moduleSet = new Set(keywordRowsFor(saveItem.value).map((r) => normalizeKeyword(r.keyword)))
  return selectedKeywords.value.filter((k) => moduleSet.has(normalizeKeyword(k)))
})

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function isResearchModuleCollapsed(item: ProspectResearchItem): boolean {
  return collapsedResearchSeeds.value.includes(researchKey(item))
}

function toggleResearchModule(item: ProspectResearchItem) {
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
  if (!normalized) return
  const next = [...selectedKeywords.value]
  const idx = next.findIndex((k) => normalizeKeyword(k) === normalized)
  if (idx >= 0) next.splice(idx, 1)
  else next.push(keyword.trim())
  selectedKeywords.value = next
}

function selectableKeywordsFor(item: ProspectResearchItem): string[] {
  return keywordRowsFor(item)
    .map((entry) => entry.keyword.trim())
    .filter((keyword) => keyword.length > 0)
}

function allSelectableKeywordsSelectedFor(item: ProspectResearchItem): boolean {
  const selectable = selectableKeywordsFor(item)
  if (!selectable.length) return false
  return selectable.every((keyword) => selectedKeywordSet.value.has(normalizeKeyword(keyword)))
}

function selectedKeywordCountFor(item: ProspectResearchItem): number {
  const selectableSet = new Set(selectableKeywordsFor(item).map((k) => normalizeKeyword(k)))
  let count = 0
  for (const selected of selectedKeywords.value) {
    if (selectableSet.has(normalizeKeyword(selected))) count += 1
  }
  return count
}

function toggleSelectAllKeywordsFor(item: ProspectResearchItem) {
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
    researchItems.value.flatMap((item) => keywordRowsFor(item)).map((item) => normalizeKeyword(item.keyword)),
  )
  selectedKeywords.value = selectedKeywords.value.filter((k) => available.has(normalizeKeyword(k)))
}

function openSaveModal(item: ProspectResearchItem) {
  saveItem.value = item
  saveModalOpen.value = true
}

async function loadResearch() {
  error.value = ''
  try {
    const res = await $fetch<{ research: ProspectResearchItem | null; researchItems?: ProspectResearchItem[] }>(
      '/api/workspace/research',
      { headers: authHeaders() },
    )
    const items = Array.isArray(res.researchItems) ? res.researchItems : res.research ? [res.research] : []
    researchItems.value = [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    syncSelectedKeywordsWithResearch()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Could not load research data.'
  }
}

async function runResearch() {
  if (!seedKeyword.value.trim()) return
  researchLoading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ research: ProspectResearchItem; researchItems?: ProspectResearchItem[] }>(
      '/api/workspace/research',
      {
        method: 'POST',
        body: {
          seedKeyword: seedKeyword.value.trim(),
          contextDomain: contextDomain.value.trim() || undefined,
        },
        headers: authHeaders(),
      },
    )
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
  if (!targetDomain.value.trim()) return
  domainResearchLoading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ research: ProspectResearchItem; researchItems?: ProspectResearchItem[] }>(
      '/api/workspace/research/domain',
      {
        method: 'POST',
        body: { targetDomain: targetDomain.value.trim(), limit: domainLimit.value },
        headers: authHeaders(),
      },
    )
    const items = Array.isArray(res.researchItems) ? res.researchItems : [res.research]
    researchItems.value = [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    if (!targetDomain.value.trim() && res.research?.targetDomain) {
      targetDomain.value = normalizeDomain(res.research.targetDomain)
    }
    syncSelectedKeywordsWithResearch()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Domain keyword research failed.'
  } finally {
    domainResearchLoading.value = false
  }
}

async function init() {
  pending.value = true
  try {
    await loadResearch()
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
</script>
