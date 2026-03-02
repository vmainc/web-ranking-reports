<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-surface-900">Reports</h1>
        <p class="mt-1 text-sm text-surface-500">Create and view analytics and Lighthouse reports for your sites.</p>
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
      <h2 class="border-b border-surface-200 px-6 py-4 text-lg font-semibold text-surface-900">Recent reports</h2>
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
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-surface-500">Site</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-surface-500">Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-surface-500">Date</th>
              <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-surface-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-200 bg-white">
            <tr v-for="r in reports" :key="r.id" class="hover:bg-surface-50/50">
              <td class="px-6 py-4 text-sm font-medium text-surface-900">{{ r.expand?.site?.name ?? '—' }}</td>
              <td class="px-6 py-4 text-sm text-surface-600">{{ reportTypeLabel(r.type) }}</td>
              <td class="px-6 py-4 text-sm text-surface-600">{{ formatDate(r.period_start || r.created) }}</td>
              <td class="px-6 py-4 text-right">
                <NuxtLink :to="reportLink(r)" class="text-primary-600 hover:underline">View</NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <NuxtLink to="/dashboard" class="mt-6 inline-block text-sm font-medium text-surface-600 hover:text-primary-600">← Back to Dashboard</NuxtLink>

    <Teleport to="body">
      <div v-if="showMakeReport" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showMakeReport = false">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" @click.stop>
          <h3 class="text-lg font-semibold text-surface-900">Make a report</h3>
          <p class="mt-1 text-sm text-surface-500">Choose a site and report type.</p>
          <form class="mt-4 space-y-4" @submit.prevent="goToReport">
            <div>
              <label class="block text-sm font-medium text-surface-700">Site</label>
              <select v-model="makeReportSiteId" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
                <option value="">Select site</option>
                <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }} ({{ s.domain }})</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Report type</label>
              <select v-model="makeReportType" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
                <option value="full">Full report</option>
                <option value="analytics">Analytics report</option>
                <option value="lighthouse">Lighthouse</option>
              </select>
              <p class="mt-1 text-xs text-surface-500">
                {{ makeReportType === 'full' ? 'All modules (GA, Ads, GSC, Lighthouse, leads, etc.) with cover and TOC.' : makeReportType === 'analytics' ? 'View GA4 performance and export PDF.' : 'Run PageSpeed Insights and see scores.' }}
              </p>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50" @click="showMakeReport = false">Cancel</button>
              <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500">Open report</button>
            </div>
          </form>
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
const makeReportType = ref<'full' | 'analytics' | 'lighthouse'>('full')

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

function reportTypeLabel(type: string): string {
  if (type === 'lighthouse') return 'Lighthouse'
  if (type === 'full') return 'Full report'
  if (type === 'analytics') return 'Analytics'
  return type || '—'
}

function reportLink(r: Report & { expand?: { site?: SiteRecord } }): string {
  const siteId = typeof r.site === 'string' ? r.site : (r.site as { id?: string })?.id
  if (!siteId) return '/dashboard'
  if (r.type === 'lighthouse') return `/sites/${siteId}/lighthouse`
  if (r.type === 'full') return `/sites/${siteId}/full-report`
  return `/sites/${siteId}/report`
}

function goToReport() {
  if (!makeReportSiteId.value) return
  showMakeReport.value = false
  const id = makeReportSiteId.value
  if (makeReportType.value === 'lighthouse') {
    navigateTo(`/sites/${id}/lighthouse`)
  } else if (makeReportType.value === 'full') {
    navigateTo(`/sites/${id}/full-report`)
  } else {
    navigateTo(`/sites/${id}/report`)
  }
}

onMounted(async () => {
  try {
    sites.value = await listSites(pb)
    const data = await $fetch<{ reports: (Report & { expand?: { site?: SiteRecord } })[] }>('/api/reports/list', {
      headers: authHeaders(),
      query: { limit: 10 },
    })
    reports.value = data.reports ?? []
  } catch {
    reports.value = []
  } finally {
    pending.value = false
  }
})
</script>
