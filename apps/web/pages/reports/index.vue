<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-surface-900">Reports</h1>
        <p class="mt-1 text-sm text-surface-500">Create and manage full reports for your sites.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
          @click="showMakeReport = true"
        >
          Make a report
        </button>
      </div>
    </div>

    <section class="rounded-xl border border-surface-200 bg-white shadow-sm">
      <h2 class="border-b border-surface-200 px-6 py-4 text-lg font-semibold text-surface-900">Your reports</h2>
      <div v-if="pending" class="px-6 py-12 text-center text-sm text-surface-500">Loading…</div>
      <div v-else-if="!reports.length" class="px-6 py-12 text-center">
        <p class="text-surface-500">No reports yet.</p>
        <button
          type="button"
          class="mt-4 text-sm font-medium text-primary-600 hover:underline"
          @click="showMakeReport = true"
        >
          Make your first report
        </button>
      </div>
      <div v-else class="overflow-hidden">
        <table class="min-w-full divide-y divide-surface-200">
          <thead class="bg-surface-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-surface-500">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-surface-500">Site</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-surface-500">Date</th>
              <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-surface-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-200 bg-white">
            <tr v-for="r in reports" :key="r.id" class="hover:bg-surface-50/50">
              <td class="px-6 py-4 text-sm font-medium text-surface-900">{{ reportDisplayName(r) }}</td>
              <td class="px-6 py-4 text-sm text-surface-600">{{ r.expand?.site?.name ?? '—' }}</td>
              <td class="px-6 py-4 text-sm text-surface-600">{{ formatDate(r.period_start || r.created) }}</td>
              <td class="px-6 py-4 text-right">
                <span class="inline-flex items-center gap-2">
                  <NuxtLink :to="reportLink(r)" class="text-primary-600 hover:underline">View</NuxtLink>
                  <span class="text-surface-300">|</span>
                  <NuxtLink :to="reportLink(r)" class="text-surface-600 hover:underline">Edit</NuxtLink>
                  <span class="text-surface-300">|</span>
                  <button
                    type="button"
                    class="text-red-600 hover:underline disabled:opacity-50"
                    :disabled="deletingId === r.id"
                    @click="confirmDelete(r)"
                  >
                    {{ deletingId === r.id ? 'Deleting…' : 'Delete' }}
                  </button>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Rank tracking overview -->
    <section class="mt-10 rounded-xl border border-surface-200 bg-white shadow-sm">
      <h2 class="border-b border-surface-200 px-6 py-4 text-lg font-semibold text-surface-900">Rank tracking</h2>
      <p class="px-6 py-2 text-sm text-surface-500">Keyword rankings by site (DataForSEO). Volume from Search Console when connected.</p>
      <div v-if="rankPending" class="px-6 py-12 text-center text-sm text-surface-500">Loading…</div>
      <div v-else-if="!rankBySite.length" class="px-6 py-12 text-center text-sm text-surface-500">No rank tracking data. Add keywords on a site’s Rank tracking page.</div>
      <div v-else class="overflow-hidden">
        <div v-for="item in rankBySite" :key="item.siteId" class="border-t border-surface-200 first:border-t-0">
          <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div>
              <h3 class="font-medium text-surface-900">{{ item.siteName }}</h3>
              <p class="text-sm text-surface-500">{{ item.keywords.length }} keyword(s)</p>
            </div>
            <NuxtLink :to="`/sites/${item.siteId}/rank-tracking`" class="text-sm font-medium text-primary-600 hover:underline">View rank report →</NuxtLink>
          </div>
          <div class="overflow-x-auto border-t border-surface-100">
            <table class="min-w-full text-sm">
              <thead class="bg-surface-50">
                <tr>
                  <th class="px-4 py-2 text-left font-medium text-surface-600">Keyword</th>
                  <th class="px-4 py-2 text-left font-medium text-surface-600">Position</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-100">
                <tr v-for="kw in item.keywords.slice(0, 10)" :key="kw.id" class="hover:bg-surface-50/50">
                  <td class="px-4 py-2 font-medium text-surface-900">{{ kw.keyword }}</td>
                  <td class="px-4 py-2">
                    <template v-if="kw.last_result_json && typeof kw.last_result_json.position === 'number'">
                      <span class="font-semibold text-primary-600">#{{ kw.last_result_json.position }}</span>
                    </template>
                    <span v-else class="text-surface-400">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="item.keywords.length > 10" class="px-6 py-2 text-xs text-surface-500">Showing first 10. View all on rank report.</p>
        </div>
      </div>
    </section>

    <NuxtLink to="/dashboard" class="mt-6 inline-block text-sm font-medium text-surface-600 hover:text-primary-600">← Back to Dashboard</NuxtLink>

    <Teleport to="body">
      <div v-if="showMakeReport" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showMakeReport = false">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" @click.stop>
          <h3 class="text-lg font-semibold text-surface-900">Make a report</h3>
          <p class="mt-1 text-sm text-surface-500">Choose a site to create a full report (cover, TOC, all modules).</p>
          <form class="mt-4 space-y-4" @submit.prevent="goToReport">
            <div>
              <label class="block text-sm font-medium text-surface-700">Site</label>
              <select v-model="makeReportSiteId" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
                <option value="">Select site</option>
                <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }} ({{ s.domain }})</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Report name <span class="font-normal text-surface-500">(optional)</span></label>
              <input v-model="makeReportName" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" placeholder="e.g. Monthly report – March" />
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50" @click="showMakeReport = false">Cancel</button>
              <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500" :disabled="creating">
                {{ creating ? 'Creating…' : 'Create report' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="reportToDelete" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="reportToDelete = null">
        <div class="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" @click.stop>
          <h3 class="text-lg font-semibold text-surface-900">Delete report?</h3>
          <p class="mt-2 text-sm text-surface-600">
            This will remove “{{ reportDisplayName(reportToDelete) }}”. You can create a new one anytime.
          </p>
          <div class="mt-4 flex justify-end gap-2">
            <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50" @click="reportToDelete = null">Cancel</button>
            <button type="button" class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500" @click="doDelete">Delete</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import type { Report } from '~/types'
import { listSites } from '~/services/sites'

const pb = usePocketbase()
const sites = ref<SiteRecord[]>([])
const reports = ref<(Report & { expand?: { site?: SiteRecord } })[]>([])
const pending = ref(true)
const showMakeReport = ref(false)
const makeReportSiteId = ref('')
const makeReportName = ref('')
const creating = ref(false)
const reportToDelete = ref<(Report & { expand?: { site?: SiteRecord } }) | null>(null)
const deletingId = ref<string | null>(null)

interface RankKw {
  id: string
  keyword: string
  last_result_json?: { position?: number } | null
}
const rankBySite = ref<{ siteId: string; siteName: string; keywords: RankKw[] }[]>([])
const rankPending = ref(true)

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'short' })
  } catch {
    return iso
  }
}

function reportDisplayName(r: Report & { expand?: { site?: SiteRecord }; payload_json?: { name?: string } }): string {
  const name = r.payload_json?.name?.trim()
  if (name) return name
  const siteName = r.expand?.site?.name ?? 'Report'
  const date = formatDate(r.period_start || r.created)
  return `${siteName} · ${date}`
}

function reportLink(r: Report & { expand?: { site?: SiteRecord } }): string {
  const siteId = typeof r.site === 'string' ? r.site : (r.site as { id?: string })?.id
  if (!siteId) return '/dashboard'
  return `/sites/${siteId}/full-report?reportId=${r.id}`
}

async function goToReport() {
  if (!makeReportSiteId.value) return
  creating.value = true
  try {
    const { report } = await $fetch<{ report: { id: string } }>('/api/reports/create', {
      method: 'POST',
      headers: authHeaders(),
      body: { siteId: makeReportSiteId.value },
    })
    const name = makeReportName.value?.trim()
    if (name) {
      await $fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: { payload_json: { name } },
      })
    }
    showMakeReport.value = false
    const id = makeReportSiteId.value
    makeReportSiteId.value = ''
    makeReportName.value = ''
    await loadReports()
    navigateTo(`/sites/${id}/full-report?reportId=${report.id}`)
  } catch {
    // leave modal open; user can retry
  } finally {
    creating.value = false
  }
}

function confirmDelete(r: Report & { expand?: { site?: SiteRecord } }) {
  reportToDelete.value = r
}

async function doDelete() {
  if (!reportToDelete.value) return
  const id = reportToDelete.value.id
  deletingId.value = id
  try {
    await $fetch(`/api/reports/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    reportToDelete.value = null
    await loadReports()
  } catch {
    reportToDelete.value = null
  } finally {
    deletingId.value = null
  }
}

async function loadReports() {
  try {
    const data = await $fetch<{ reports: (Report & { expand?: { site?: SiteRecord } })[] }>('/api/reports/list', {
      headers: authHeaders(),
      query: { limit: 50, type: 'full' },
    })
    reports.value = data.reports ?? []
  } catch {
    reports.value = []
  }
}

async function loadRankBySite() {
  rankPending.value = true
  rankBySite.value = []
  try {
    const list = sites.value
    const results = await Promise.all(
      list.map(async (site) => {
        try {
          const res = await $fetch<{ keywords: RankKw[] }>(`/api/sites/${site.id}/rank-tracking/list`, { headers: authHeaders() })
          const keywords = res?.keywords ?? []
          return { siteId: site.id, siteName: site.name, keywords }
        } catch {
          return { siteId: site.id, siteName: site.name, keywords: [] as RankKw[] }
        }
      })
    )
    rankBySite.value = results.filter((r) => r.keywords.length > 0)
  } catch {
    rankBySite.value = []
  } finally {
    rankPending.value = false
  }
}

onMounted(async () => {
  try {
    sites.value = await listSites(pb)
    await loadReports()
    await loadRankBySite()
  } catch {
    reports.value = []
  } finally {
    pending.value = false
  }
})
</script>
