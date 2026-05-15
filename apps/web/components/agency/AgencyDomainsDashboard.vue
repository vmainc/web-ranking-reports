<template>
  <div
    class="domains-dashboard overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-slate-100 shadow-2xl shadow-primary-900/20 ring-1 ring-white/5"
  >
    <div class="border-b border-white/5 bg-slate-900/80 px-5 py-6 backdrop-blur-md sm:px-8 sm:py-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Domains</h2>
          <p class="mt-1.5 max-w-xl text-sm text-slate-400">
            Monitor all client domains and expiration dates in one place.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-primary-500/40 bg-primary-600/90 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-900/30 transition hover:border-primary-400/60 hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="refreshing || pending"
          @click="onRefresh"
        >
          <span
            v-if="refreshing"
            class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
            aria-hidden="true"
          />
          Refresh Domains
        </button>
      </div>

      <div
        v-if="data && !data.whoisConfigured"
        class="mt-5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90"
      >
        WHOIS lookups are not configured. Add your APILayer key in app settings to see expiration and registrar data.
        You can still review domains gathered from sites and Search Console.
      </div>
      <p v-if="error" class="mt-4 rounded-lg border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-200">
        {{ error }}
      </p>
    </div>

    <div class="px-5 py-6 sm:px-8 sm:py-8">
      <!-- Skeleton -->
      <template v-if="pending && !data">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="i in 4" :key="i" class="h-24 animate-pulse rounded-xl bg-white/5" />
        </div>
        <div class="mt-8 h-12 animate-pulse rounded-lg bg-white/5" />
        <div class="mt-4 h-64 animate-pulse rounded-xl bg-white/5" />
      </template>

      <template v-else-if="data">
        <div v-if="data.domains.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
          <div
            class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400"
          >
            <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
              />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-white">No domains connected yet.</h3>
          <p class="mt-2 max-w-md text-sm text-slate-400">
            Connect sites to begin monitoring domain expiration and ownership data.
          </p>
        </div>

        <template v-else>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div
              v-for="card in statCards"
              :key="card.label"
              class="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-lg shadow-black/20 backdrop-blur-sm transition hover:border-primary-500/30 hover:bg-white/[0.06]"
            >
              <div
                class="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-50 blur-2xl transition group-hover:opacity-70"
                :class="card.glow"
              />
              <p class="text-xs font-medium uppercase tracking-wider text-slate-500">{{ card.label }}</p>
              <p class="mt-2 text-2xl font-semibold tabular-nums text-white">{{ card.value }}</p>
              <p v-if="card.hint" class="mt-1 text-xs text-slate-500">{{ card.hint }}</p>
            </div>
          </div>

          <div class="mt-8">
            <label class="sr-only" for="domain-search">Search domains</label>
            <input
              id="domain-search"
              v-model="search"
              type="search"
              placeholder="Search domain or client…"
              class="w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary-500/50 focus:outline-none focus:ring-1 focus:ring-primary-500/40"
            />
          </div>

          <!-- Desktop table -->
          <div class="mt-4 hidden md:block overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02]">
            <table class="min-w-full divide-y divide-white/5 text-left text-sm">
              <thead>
                <tr class="text-xs uppercase tracking-wide text-slate-500">
                  <th class="px-4 py-3 font-medium">
                    <button type="button" class="th-sort" :class="{ 'text-primary-300': sortKey === 'domain' }" @click="toggleSort('domain')">
                      Domain<span v-if="sortKey === 'domain'" class="sort-ind">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                    </button>
                  </th>
                  <th class="px-4 py-3 font-medium">
                    <button type="button" class="th-sort" :class="{ 'text-primary-300': sortKey === 'sites' }" @click="toggleSort('sites')">
                      Client / Site<span v-if="sortKey === 'sites'" class="sort-ind">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                    </button>
                  </th>
                  <th class="px-4 py-3 font-medium">
                    <button
                      type="button"
                      class="th-sort"
                      :class="{ 'text-primary-300': sortKey === 'expirationDate' }"
                      @click="toggleSort('expirationDate')"
                    >
                      Expiration<span v-if="sortKey === 'expirationDate'" class="sort-ind">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                    </button>
                  </th>
                  <th class="px-4 py-3 font-medium">
                    <button
                      type="button"
                      class="th-sort"
                      :class="{ 'text-primary-300': sortKey === 'daysRemaining' }"
                      @click="toggleSort('daysRemaining')"
                    >
                      Days left<span v-if="sortKey === 'daysRemaining'" class="sort-ind">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                    </button>
                  </th>
                  <th class="px-4 py-3 font-medium">
                    <button
                      type="button"
                      class="th-sort"
                      :class="{ 'text-primary-300': sortKey === 'domainAgeYears' }"
                      @click="toggleSort('domainAgeYears')"
                    >
                      Domain age<span v-if="sortKey === 'domainAgeYears'" class="sort-ind">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                    </button>
                  </th>
                  <th class="px-4 py-3 font-medium">
                    <button
                      type="button"
                      class="th-sort"
                      :class="{ 'text-primary-300': sortKey === 'registrar' }"
                      @click="toggleSort('registrar')"
                    >
                      Registrar<span v-if="sortKey === 'registrar'" class="sort-ind">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                    </button>
                  </th>
                  <th class="px-4 py-3 font-medium">
                    <button
                      type="button"
                      class="th-sort"
                      :class="{ 'text-primary-300': sortKey === 'updatedAt' }"
                      @click="toggleSort('updatedAt')"
                    >
                      Last updated<span v-if="sortKey === 'updatedAt'" class="sort-ind">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                <tr
                  v-for="row in pageRows"
                  :key="row.domain"
                  class="transition hover:bg-white/[0.03]"
                >
                  <td class="whitespace-nowrap px-4 py-3">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-medium text-white">{{ row.domain }}</span>
                      <span class="badge" :class="badgeClass(row)">{{ badgeLabel(row) }}</span>
                    </div>
                    <p v-if="row.whoisError" class="mt-0.5 text-xs text-amber-400/90">{{ row.whoisError }}</p>
                  </td>
                  <td class="max-w-[200px] px-4 py-3 text-slate-300">
                    <span class="line-clamp-2">{{ siteLabel(row) }}</span>
                  </td>
                  <td class="whitespace-nowrap px-4 py-3 tabular-nums text-slate-300">
                    {{ formatDate(row.expirationDate) }}
                  </td>
                  <td class="whitespace-nowrap px-4 py-3 tabular-nums text-slate-300">
                    {{ daysLabel(row.daysRemaining) }}
                  </td>
                  <td class="whitespace-nowrap px-4 py-3 text-slate-300">
                    {{ ageLabel(row.domainAgeYears) }}
                  </td>
                  <td class="max-w-[160px] px-4 py-3 text-slate-400">
                    <span class="line-clamp-2">{{ row.registrar || '—' }}</span>
                  </td>
                  <td class="whitespace-nowrap px-4 py-3 tabular-nums text-slate-400">
                    {{ formatDateTime(row.updatedAt) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile cards -->
          <ul class="mt-4 space-y-3 md:hidden">
            <li
              v-for="row in pageRows"
              :key="row.domain"
              class="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-2">
                <span class="font-semibold text-white">{{ row.domain }}</span>
                <span class="badge" :class="badgeClass(row)">{{ badgeLabel(row) }}</span>
              </div>
              <p v-if="row.whoisError" class="mt-1 text-xs text-amber-400/90">{{ row.whoisError }}</p>
              <dl class="mt-3 space-y-2 text-sm">
                <div class="flex justify-between gap-2">
                  <dt class="text-slate-500">Client / Site</dt>
                  <dd class="text-right text-slate-300">{{ siteLabel(row) }}</dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt class="text-slate-500">Expires</dt>
                  <dd class="tabular-nums text-slate-300">{{ formatDate(row.expirationDate) }}</dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt class="text-slate-500">Days left</dt>
                  <dd class="tabular-nums text-slate-300">{{ daysLabel(row.daysRemaining) }}</dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt class="text-slate-500">Age</dt>
                  <dd class="text-slate-300">{{ ageLabel(row.domainAgeYears) }}</dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt class="text-slate-500">Registrar</dt>
                  <dd class="text-right text-slate-400">{{ row.registrar || '—' }}</dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt class="text-slate-500">Updated</dt>
                  <dd class="tabular-nums text-slate-400">{{ formatDateTime(row.updatedAt) }}</dd>
                </div>
              </dl>
            </li>
          </ul>

          <div
            v-if="totalPages > 1"
            class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4 text-sm text-slate-400"
          >
            <span>
              Page {{ page }} of {{ totalPages }}
              <span class="text-slate-600">·</span>
              {{ filteredSorted.length }} domain{{ filteredSorted.length === 1 ? '' : 's' }}
            </span>
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-lg border border-white/10 px-3 py-1.5 font-medium text-slate-200 transition hover:bg-white/5 disabled:opacity-40"
                :disabled="page <= 1"
                @click="page--"
              >
                Previous
              </button>
              <button
                type="button"
                class="rounded-lg border border-white/10 px-3 py-1.5 font-medium text-slate-200 transition hover:bg-white/5 disabled:opacity-40"
                :disabled="page >= totalPages"
                @click="page++"
              >
                Next
              </button>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AgencyDomainRow } from '~/composables/useAgencyDomains'

type SortKey =
  | 'domain'
  | 'sites'
  | 'expirationDate'
  | 'daysRemaining'
  | 'domainAgeYears'
  | 'registrar'
  | 'updatedAt'

const { data, pending, refreshing, error, load } = useAgencyDomains()

const search = ref('')
const sortKey = ref<SortKey>('domain')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const PAGE_SIZE = 12

onMounted(() => {
  void load(false)
})

function onRefresh() {
  void load(true)
}

watch(search, () => {
  page.value = 1
})

const statCards = computed(() => {
  const s = data.value?.stats
  if (!s) return []
  const avg = s.averageDomainAgeYears
  return [
    {
      label: 'Total Domains',
      value: s.total,
      hint: null as string | null,
      glow: 'bg-primary-500/30',
    },
    {
      label: 'Expiring in 30 Days',
      value: s.expiring30,
      hint: 'Renewal window 0–30 days',
      glow: 'bg-red-500/25',
    },
    {
      label: 'Expiring in 90 Days',
      value: s.expiring90,
      hint: '31–90 days out',
      glow: 'bg-amber-500/25',
    },
    {
      label: 'Average Domain Age',
      value: avg == null ? '—' : `${avg.toFixed(1)} yrs`,
      hint: 'From WHOIS creation date',
      glow: 'bg-emerald-500/20',
    },
  ]
})

function siteLabel(row: AgencyDomainRow): string {
  return row.sites.map((x) => x.name).join(', ') || '—'
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function daysLabel(days: number | null): string {
  if (days == null) return '—'
  if (days < 0) return 'Expired'
  return `${days} days`
}

function ageLabel(years: number | null): string {
  if (years == null || !Number.isFinite(years)) return '—'
  const y = Math.max(0, Math.floor(years))
  return `${y} year${y === 1 ? '' : 's'}`
}

function toggleSort(key: SortKey) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
  page.value = 1
}

function badgeLabel(row: AgencyDomainRow): string {
  if (row.status === 'unknown') return 'Unknown'
  if (row.daysRemaining != null && row.daysRemaining < 0) return 'Expired'
  if (row.status === 'healthy') return 'Healthy'
  if (row.status === 'warning') return 'Warning'
  return 'Critical'
}

function badgeClass(row: AgencyDomainRow): string {
  if (row.status === 'unknown') return 'border-slate-600 bg-slate-800/90 text-slate-400'
  if (row.daysRemaining != null && row.daysRemaining < 0) {
    return 'animate-pulse border-red-500/55 bg-red-950/70 text-red-200'
  }
  if (row.status === 'healthy') return 'border-emerald-500/40 bg-emerald-950/55 text-emerald-300'
  if (row.status === 'warning') return 'border-amber-500/45 bg-amber-950/55 text-amber-200'
  return 'animate-pulse border-red-500/50 bg-red-950/60 text-red-200'
}

function sortValue(row: AgencyDomainRow, key: SortKey): string | number {
  switch (key) {
    case 'domain':
      return row.domain.toLowerCase()
    case 'sites':
      return siteLabel(row).toLowerCase()
    case 'expirationDate':
      return row.expirationDate ? new Date(row.expirationDate + 'T12:00:00').getTime() : Number.POSITIVE_INFINITY
    case 'daysRemaining':
      return row.daysRemaining ?? Number.POSITIVE_INFINITY
    case 'domainAgeYears':
      return row.domainAgeYears ?? -1
    case 'registrar':
      return (row.registrar || '').toLowerCase()
    case 'updatedAt':
      return row.updatedAt ? new Date(row.updatedAt).getTime() : 0
  }
}

const filteredSorted = computed(() => {
  const rows = data.value?.domains ?? []
  const q = search.value.trim().toLowerCase()
  let list = q
    ? rows.filter((r) => {
        if (r.domain.toLowerCase().includes(q)) return true
        return r.sites.some((s) => s.name.toLowerCase().includes(q))
      })
    : [...rows]

  const key = sortKey.value
  const dir = sortDir.value
  list.sort((a, b) => {
    const va = sortValue(a, key)
    const vb = sortValue(b, key)
    let c = 0
    if (typeof va === 'number' && typeof vb === 'number') c = va - vb
    else c = String(va).localeCompare(String(vb))
    return dir === 'asc' ? c : -c
  })

  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredSorted.value.length / PAGE_SIZE)))

watch(filteredSorted, () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})

const pageRows = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filteredSorted.value.slice(start, start + PAGE_SIZE)
})
</script>

<style scoped>
.th-sort {
  @apply inline-flex items-center gap-0.5 rounded px-0.5 py-0.5 text-left font-medium uppercase tracking-wide transition hover:text-slate-200;
}
.sort-ind {
  @apply text-[10px] font-normal opacity-80;
}
.badge {
  @apply inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide;
}
</style>