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
        <h1 class="text-2xl font-semibold text-surface-900">Backlinks</h1>
        <p class="mt-1 text-sm text-surface-500">
          Check links pointing back to your site. Data from
          <a href="https://dataforseo.com/apis/backlinks-api" target="_blank" rel="noopener noreferrer" class="text-primary-600 underline">DataForSEO Backlinks</a>
          (same credentials as rank tracking in Admin → Integrations).
        </p>
      </div>

      <section class="mb-8 rounded-xl border border-surface-200 bg-white p-5 shadow-sm sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <p class="max-w-2xl text-sm text-surface-600">
            Each refresh runs five live API requests and uses your DataForSEO balance. Load when you need an up-to-date profile.
          </p>
          <button
            type="button"
            class="shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="backlinksLoading || !site.domain"
            @click="loadBacklinks"
          >
            {{ backlinksLoading ? 'Loading…' : backlinksData ? 'Refresh data' : 'Load backlink data' }}
          </button>
        </div>

        <p v-if="backlinksError" class="mt-4 text-sm text-red-600">{{ backlinksError }}</p>

        <div v-if="backlinksData" class="mt-6 space-y-6">
          <p class="text-xs text-surface-500">
            Target <span class="font-mono text-surface-700">{{ backlinksData.target }}</span>
            · Fetched {{ formatBacklinksWhen(backlinksData.fetchedAt) }}
            <span v-if="backlinksTotalCost > 0" class="ml-1">· Est. API cost ${{ backlinksTotalCost.toFixed(4) }}</span>
          </p>

          <div v-if="backlinksPartialErrors.length" class="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
            <span class="font-medium">Partial results:</span>
            {{ backlinksPartialErrors.join(' · ') }}
          </div>

          <div v-if="backlinksSummaryKpis.length" class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div
              v-for="row in backlinksSummaryKpis"
              :key="row.label"
              class="rounded-lg border border-surface-200 bg-surface-50/50 px-3 py-2.5"
            >
              <p class="text-[11px] font-medium uppercase tracking-wide text-surface-500">{{ row.label }}</p>
              <p class="mt-0.5 text-lg font-semibold text-surface-900">{{ row.value }}</p>
            </div>
          </div>

          <div v-if="backlinksSummaryHasDistribution" class="grid gap-3 lg:grid-cols-3">
            <div v-if="topObjectEntries(backlinksData.summary?.referring_links_types, 12).length" class="rounded-lg border border-surface-200 bg-surface-50/50 p-3">
              <p class="mb-2 text-xs font-semibold text-surface-800">Link types</p>
              <ul class="max-h-40 space-y-1 overflow-y-auto text-xs">
                <li v-for="[k, v] in topObjectEntries(backlinksData.summary?.referring_links_types, 12)" :key="k" class="flex justify-between gap-2">
                  <span class="truncate text-surface-600">{{ formatMetricKey(k) }}</span>
                  <span class="shrink-0 font-medium text-surface-900">{{ formatNum(v) }}</span>
                </li>
              </ul>
            </div>
            <div v-if="topObjectEntries(backlinksData.summary?.referring_links_attributes, 12).length" class="rounded-lg border border-surface-200 bg-surface-50/50 p-3">
              <p class="mb-2 text-xs font-semibold text-surface-800">Link attributes</p>
              <ul class="max-h-40 space-y-1 overflow-y-auto text-xs">
                <li v-for="[k, v] in topObjectEntries(backlinksData.summary?.referring_links_attributes, 12)" :key="k" class="flex justify-between gap-2">
                  <span class="truncate text-surface-600">{{ formatMetricKey(k) }}</span>
                  <span class="shrink-0 font-medium text-surface-900">{{ formatNum(v) }}</span>
                </li>
              </ul>
            </div>
            <div v-if="topObjectEntries(backlinksData.summary?.referring_links_platform_types, 12).length" class="rounded-lg border border-surface-200 bg-surface-50/50 p-3">
              <p class="mb-2 text-xs font-semibold text-surface-800">Referring platforms</p>
              <ul class="max-h-40 space-y-1 overflow-y-auto text-xs">
                <li v-for="[k, v] in topObjectEntries(backlinksData.summary?.referring_links_platform_types, 12)" :key="k" class="flex justify-between gap-2">
                  <span class="truncate text-surface-600">{{ formatMetricKey(k) }}</span>
                  <span class="shrink-0 font-medium text-surface-900">{{ formatNum(v) }}</span>
                </li>
              </ul>
            </div>
          </div>

          <div v-if="backlinksData.referringDomains.length" class="overflow-hidden rounded-lg border border-surface-200">
            <p class="border-b border-surface-200 bg-surface-50 px-3 py-2 text-xs font-semibold text-surface-800">Top referring domains (by domain rank)</p>
            <div class="overflow-x-auto">
              <table class="min-w-full text-left text-xs">
                <thead class="bg-surface-50/80 text-surface-600">
                  <tr>
                    <th class="px-3 py-2 font-medium">Domain</th>
                    <th class="px-3 py-2 font-medium">Rank</th>
                    <th class="px-3 py-2 font-medium">Backlinks</th>
                    <th class="px-3 py-2 font-medium">Ref. pages</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in backlinksData.referringDomains" :key="i" class="border-t border-surface-100">
                    <td class="px-3 py-2 font-mono text-surface-800">{{ r.domain ?? '—' }}</td>
                    <td class="px-3 py-2">{{ r.rank ?? '—' }}</td>
                    <td class="px-3 py-2">{{ formatNum(r.backlinks) }}</td>
                    <td class="px-3 py-2">{{ formatNum(r.referring_pages) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="backlinksData.anchors.length" class="overflow-hidden rounded-lg border border-surface-200">
            <p class="border-b border-surface-200 bg-surface-50 px-3 py-2 text-xs font-semibold text-surface-800">Top anchor text</p>
            <div class="overflow-x-auto">
              <table class="min-w-full text-left text-xs">
                <thead class="bg-surface-50/80 text-surface-600">
                  <tr>
                    <th class="px-3 py-2 font-medium">Anchor</th>
                    <th class="px-3 py-2 font-medium">Backlinks</th>
                    <th class="px-3 py-2 font-medium">Domains</th>
                    <th class="px-3 py-2 font-medium">Pages</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in backlinksData.anchors" :key="i" class="border-t border-surface-100">
                    <td class="max-w-xs truncate px-3 py-2 text-surface-800" :title="r.anchor">{{ r.anchor === '' ? '(empty)' : r.anchor ?? '—' }}</td>
                    <td class="px-3 py-2">{{ formatNum(r.backlinks) }}</td>
                    <td class="px-3 py-2">{{ formatNum(r.referring_domains) }}</td>
                    <td class="px-3 py-2">{{ formatNum(r.referring_pages) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="backlinksData.domainPages.length" class="overflow-hidden rounded-lg border border-surface-200">
            <p class="border-b border-surface-200 bg-surface-50 px-3 py-2 text-xs font-semibold text-surface-800">Your pages with the most backlinks</p>
            <div class="overflow-x-auto">
              <table class="min-w-full text-left text-xs">
                <thead class="bg-surface-50/80 text-surface-600">
                  <tr>
                    <th class="px-3 py-2 font-medium">URL</th>
                    <th class="px-3 py-2 font-medium">Title</th>
                    <th class="px-3 py-2 font-medium">Backlinks</th>
                    <th class="px-3 py-2 font-medium">Ref. domains</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in backlinksData.domainPages" :key="i" class="border-t border-surface-100">
                    <td class="max-w-[200px] truncate px-3 py-2 font-mono text-surface-800" :title="r.page">{{ r.page ?? '—' }}</td>
                    <td class="max-w-[180px] truncate px-3 py-2" :title="r.title">{{ r.title ?? '—' }}</td>
                    <td class="px-3 py-2">{{ formatNum(r.backlinks) }}</td>
                    <td class="px-3 py-2">{{ formatNum(r.referring_domains) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="backlinksData.sampleBacklinks.length" class="overflow-hidden rounded-lg border border-surface-200">
            <p class="border-b border-surface-200 bg-surface-50 px-3 py-2 text-xs font-semibold text-surface-800">Sample backlinks (highest rank)</p>
            <div class="overflow-x-auto">
              <table class="min-w-full text-left text-xs">
                <thead class="bg-surface-50/80 text-surface-600">
                  <tr>
                    <th class="px-3 py-2 font-medium">From</th>
                    <th class="px-3 py-2 font-medium">To</th>
                    <th class="px-3 py-2 font-medium">Anchor</th>
                    <th class="px-3 py-2 font-medium">Type</th>
                    <th class="px-3 py-2 font-medium">Follow</th>
                    <th class="px-3 py-2 font-medium">Rank</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in backlinksData.sampleBacklinks" :key="i" class="border-t border-surface-100">
                    <td class="max-w-[200px] px-3 py-2">
                      <a
                        v-if="r.url_from"
                        :href="r.url_from"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="break-all font-mono text-primary-600 hover:underline"
                      >{{ r.domain_from }}</a>
                      <span v-else class="font-mono text-surface-800">{{ r.domain_from ?? '—' }}</span>
                    </td>
                    <td class="max-w-[200px] truncate px-3 py-2 font-mono text-surface-700" :title="r.url_to">{{ r.url_to ?? '—' }}</td>
                    <td class="max-w-[140px] truncate px-3 py-2" :title="r.anchor">{{ r.anchor ?? '—' }}</td>
                    <td class="px-3 py-2">{{ r.item_type ?? '—' }}</td>
                    <td class="px-3 py-2">{{ r.dofollow === true ? 'Do' : r.dofollow === false ? 'No' : '—' }}</td>
                    <td class="px-3 py-2">{{ r.rank ?? '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
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

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()

const site = ref<SiteRecord | null>(null)
const pending = ref(true)

type BacklinksPayload = {
  target: string
  fetchedAt: string
  costs: Partial<Record<string, number>>
  errors: Partial<Record<string, string>>
  summary: Record<string, unknown> | null
  referringDomains: Array<{
    domain?: string
    rank?: number
    backlinks?: number
    referring_pages?: number
    referring_domains?: number
  }>
  anchors: Array<{
    anchor?: string
    backlinks?: number
    referring_domains?: number
    referring_pages?: number
  }>
  domainPages: Array<{
    page?: string
    title?: string
    backlinks?: number
    referring_domains?: number
  }>
  sampleBacklinks: Array<{
    domain_from?: string
    url_from?: string
    url_to?: string
    anchor?: string
    dofollow?: boolean
    rank?: number
    item_type?: string
  }>
}

const backlinksData = ref<BacklinksPayload | null>(null)
const backlinksLoading = ref(false)
const backlinksError = ref('')

const backlinksTotalCost = computed(() => {
  const c = backlinksData.value?.costs
  if (!c) return 0
  return Object.values(c).reduce((sum, x) => sum + (typeof x === 'number' ? x : 0), 0)
})

const backlinksPartialErrors = computed(() => {
  const e = backlinksData.value?.errors
  if (!e) return []
  return Object.entries(e).map(([k, v]) => `${k}: ${v}`)
})

function topObjectEntries(obj: unknown, limit: number): [string, number][] {
  if (!obj || typeof obj !== 'object') return []
  const ent = Object.entries(obj as Record<string, unknown>)
    .map(([k, v]) => {
      const n = typeof v === 'number' ? v : Number(v)
      return [k, n] as [string, number]
    })
    .filter(([, n]) => !Number.isNaN(n))
    .sort((a, b) => b[1] - a[1])
  return ent.slice(0, limit)
}

function formatSummaryCell(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return v.toLocaleString()
  if (typeof v === 'string') return v.trim() || '—'
  return '—'
}

const backlinksSummaryKpis = computed(() => {
  const s = backlinksData.value?.summary
  if (!s) return [] as { label: string; value: string }[]
  const rows: { label: string; key: string }[] = [
    { label: 'Backlinks', key: 'backlinks' },
    { label: 'Referring domains', key: 'referring_domains' },
    { label: 'Referring main domains', key: 'referring_main_domains' },
    { label: 'Referring pages', key: 'referring_pages' },
    { label: 'Referring IPs', key: 'referring_ips' },
    { label: 'Referring subnets', key: 'referring_subnets' },
    { label: 'Domain rank (0–100)', key: 'rank' },
    { label: 'Target spam score', key: 'target_spam_score' },
    { label: 'Backlinks spam score', key: 'backlinks_spam_score' },
    { label: 'Broken backlinks', key: 'broken_backlinks' },
    { label: 'Broken pages', key: 'broken_pages' },
    { label: 'Crawled pages', key: 'crawled_pages' },
    { label: 'External links (site)', key: 'external_links_count' },
    { label: 'Internal links (site)', key: 'internal_links_count' },
    { label: 'First seen', key: 'first_seen' },
  ]
  return rows.map(({ label, key }) => ({ label, value: formatSummaryCell(s[key]) })).filter((r) => r.value !== '—')
})

const backlinksSummaryHasDistribution = computed(() => {
  const s = backlinksData.value?.summary
  if (!s) return false
  for (const k of ['referring_links_types', 'referring_links_attributes', 'referring_links_platform_types'] as const) {
    if (topObjectEntries(s[k], 1).length > 0) return true
  }
  return false
})

function formatNum(v: number | undefined | null): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return v.toLocaleString()
}

function formatBacklinksWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function formatMetricKey(k: string): string {
  return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadBacklinks() {
  if (!site.value?.id || backlinksLoading.value) return
  backlinksLoading.value = true
  backlinksError.value = ''
  try {
    backlinksData.value = await $fetch<BacklinksPayload>(`/api/sites/${site.value.id}/backlinks/fetch`, {
      method: 'POST',
      headers: authHeaders(),
    })
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    backlinksError.value = err?.data?.message ?? err?.message ?? 'Failed to load backlinks'
  } finally {
    backlinksLoading.value = false
  }
}

async function init() {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>
