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
        <p v-if="loadError" class="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {{ loadError }}
        </p>
      </div>

      <!-- Add keyword -->
      <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="mb-3 text-lg font-medium text-surface-900">Add keyword</h2>
        <form class="flex flex-wrap items-end gap-3" @submit.prevent="addKeyword">
          <div class="min-w-[200px] flex-1">
            <label for="new-keyword" class="sr-only">Keyword</label>
            <input
              id="new-keyword"
              v-model="newKeyword"
              type="text"
              class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 placeholder-surface-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="e.g. best coffee roasters"
              maxlength="700"
            />
          </div>
          <button
            type="submit"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="addLoading || keywords.length >= maxKeywords"
          >
            {{ addLoading ? 'Adding…' : 'Add' }}
          </button>
        </form>
        <p v-if="addError" class="mt-2 text-sm text-red-600">{{ addError }}</p>
        <p v-if="keywords.length >= maxKeywords" class="mt-2 text-sm text-amber-700">
          Maximum {{ maxKeywords }} keywords. Remove one to add more.
        </p>
      </section>

      <!-- Refresh rankings -->
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 class="text-lg font-medium text-surface-900">Keywords & rankings</h2>
        <button
          type="button"
          class="rounded-lg border border-primary-600 bg-white px-4 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50 disabled:opacity-50"
          :disabled="fetchLoading || keywords.length === 0"
          @click="refreshRankings"
        >
          {{ fetchLoading ? 'Fetching…' : 'Refresh rankings' }}
        </button>
      </div>
      <p v-if="fetchError" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        {{ fetchError }}
      </p>
      <p v-if="fetchError && fetchError.includes('not configured')" class="mb-4 text-sm text-surface-600">
        An admin can add DataForSEO credentials in <NuxtLink to="/admin/integrations" class="text-primary-600 underline">Admin → Integrations</NuxtLink>.
      </p>

      <!-- Keywords table -->
      <section class="rounded-xl border border-surface-200 bg-white shadow-sm overflow-hidden">
        <div v-if="keywords.length === 0" class="p-8 text-center text-surface-500">
          No keywords yet. Add a keyword above to start tracking.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-surface-200">
            <thead class="bg-surface-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Keyword</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Position</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">URL</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Last updated</th>
                <th class="px-4 py-3 w-20 text-right text-xs font-medium uppercase text-surface-500">Remove</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-200 bg-white">
              <tr v-for="kw in keywords" :key="kw.id" class="hover:bg-surface-50/50">
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
                <td class="max-w-[280px] px-4 py-3 text-sm">
                  <template v-if="kw.last_result_json?.url">
                    <a
                      :href="kw.last_result_json.url"
                      target="_blank"
                      rel="noopener"
                      class="truncate block text-primary-600 hover:underline"
                      :title="kw.last_result_json.url"
                    >
                      {{ kw.last_result_json.title || kw.last_result_json.url }}
                    </a>
                  </template>
                  <span v-else class="text-surface-400">—</span>
                </td>
                <td class="px-4 py-3 text-xs text-surface-500">
                  {{ kw.last_result_json?.fetchedAt ? formatDate(kw.last_result_json.fetchedAt) : '—' }}
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
import { getSite } from '~/services/sites'

interface RankKeyword {
  id: string
  site: string
  keyword: string
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

const site = ref<SiteRecord | null>(null)
const keywords = ref<RankKeyword[]>([])
const maxKeywords = ref(100)
const pending = ref(true)
const newKeyword = ref('')
const addLoading = ref(false)
const addError = ref('')
const fetchLoading = ref(false)
const fetchError = ref('')
const loadError = ref('')
const deleteLoading = ref<string | null>(null)

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

async function loadSite() {
  site.value = await getSite(pb, siteId.value)
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
  if (!site.value || !newKeyword.value.trim()) return
  addError.value = ''
  addLoading.value = true
  try {
    await $fetch(`/api/sites/${site.value.id}/rank-tracking/list`, {
      method: 'POST',
      body: { keyword: newKeyword.value.trim() },
      headers: authHeaders(),
    })
    newKeyword.value = ''
    await loadKeywords()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    addError.value = err?.data?.message ?? err?.message ?? 'Failed to add keyword'
  } finally {
    addLoading.value = false
  }
}

async function refreshRankings() {
  if (!site.value) return
  fetchError.value = ''
  fetchLoading.value = true
  try {
    await $fetch(`/api/sites/${site.value.id}/rank-tracking/fetch`, {
      method: 'POST',
      headers: authHeaders(),
    })
    await loadKeywords()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    fetchError.value = err?.data?.message ?? err?.message ?? 'Failed to fetch rankings'
  } finally {
    fetchLoading.value = false
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
    if (site.value) await loadKeywords()
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>
