<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
    <div class="mb-8">
      <h1 class="text-2xl font-semibold text-surface-900">Reports</h1>
      <p class="mt-1 text-sm text-surface-500">
        <template v-if="plan === null">Manual reports (full layout or Weekly Snapshot overview).</template>
        <template v-else-if="showAutomatedReportsUi">
          Manual reports (full layout or Weekly Snapshot overview) and automated snapshots per site.
        </template>
        <template v-else>
          Manual reports: full layout or Weekly Snapshot overview. Automated scheduling and emailed snapshots are on
          <strong>Growth</strong> and above.
        </template>
      </p>
    </div>

    <div v-if="showAutomatedReportsUi" class="mb-6 flex gap-1 border-b border-surface-200">
      <button
        type="button"
        class="border-b-2 px-4 py-2.5 text-sm font-medium transition"
        :class="
          reportsTab === 'manual'
            ? 'border-primary-600 text-primary-700'
            : 'border-transparent text-surface-600 hover:text-surface-900'
        "
        @click="reportsTab = 'manual'"
      >
        Manual Reports
      </button>
      <button
        type="button"
        class="border-b-2 px-4 py-2.5 text-sm font-medium transition"
        :class="
          reportsTab === 'automated'
            ? 'border-primary-600 text-primary-700'
            : 'border-transparent text-surface-600 hover:text-surface-900'
        "
        @click="reportsTab = 'automated'"
      >
        Automated Reports
      </button>
    </div>

    <div v-show="showAutomatedReportsUi && reportsTab === 'automated'">
      <ReportsAutomatedReports :sites="sites" :reports="reports" />
    </div>

    <section v-show="reportsTab === 'manual'" class="rounded-xl border border-surface-200 bg-white shadow-sm">
      <div class="flex flex-col gap-3 border-b border-surface-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-lg font-semibold text-surface-900">Your reports</h2>
        <div
          v-if="showFreeReportUpgradeCta"
          class="flex w-full flex-col gap-3 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-surface-800 sm:max-w-lg sm:items-end"
        >
          <p class="text-left sm:text-right">
            Your <strong>Free</strong> plan includes one manual report. Upgrade for more reports and Growth features like
            automated scheduling.
          </p>
          <NuxtLink
            to="/dashboard/billing"
            class="inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 sm:w-auto"
          >
            View plans &amp; upgrade
          </NuxtLink>
        </div>
        <button
          v-else
          type="button"
          class="inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 sm:w-auto"
          @click="showBuildReport = true"
        >
          Build your report
        </button>
      </div>
      <div v-if="pending" class="px-6 py-12 text-center text-sm text-surface-500">Loading…</div>
      <div v-else-if="!reports.length" class="px-6 py-12 text-center">
        <p class="text-surface-500">No reports yet.</p>
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
            <tr v-for="r in reports" :key="r.id" class="transition-colors hover:bg-surface-50/50">
              <td class="px-6 py-4 text-sm font-medium text-surface-900">{{ reportDisplayName(r) }}</td>
              <td class="px-6 py-4 text-sm text-surface-600">{{ r.expand?.site?.name ?? '—' }}</td>
              <td class="px-6 py-4 text-sm text-surface-600">{{ formatDate(r.period_start || r.created) }}</td>
              <td class="px-6 py-4 text-right">
                <span class="inline-flex flex-wrap items-center gap-2">
                  <NuxtLink :to="`/reports/${r.id}/preview`" class="font-medium text-primary-600 hover:underline">View</NuxtLink>
                  <span class="text-surface-300" aria-hidden="true">|</span>
                  <NuxtLink :to="`/reports/${r.id}/builder`" class="font-medium text-surface-600 hover:underline">Edit</NuxtLink>
                  <template v-if="!showFreeReportUpgradeCta">
                    <span class="text-surface-300">|</span>
                    <button
                      type="button"
                      class="font-medium text-primary-600 hover:underline disabled:opacity-50"
                      :disabled="duplicatingId === r.id"
                      @click="openDuplicateModal(r)"
                    >
                      {{ duplicatingId === r.id ? 'Duplicating…' : 'Duplicate' }}
                    </button>
                  </template>
                  <template v-if="reportSiteId(r)">
                    <span class="text-surface-300">|</span>
                    <button
                      type="button"
                      class="font-medium text-surface-700 hover:underline disabled:opacity-50"
                      :disabled="pdfDownloadingForReportId !== null"
                      @click="downloadReportPdf(r)"
                    >
                      {{ pdfDownloadingForReportId === r.id ? 'Downloading…' : 'Download' }}
                    </button>
                  </template>
                  <span class="text-surface-300">|</span>
                  <button
                    type="button"
                    class="font-medium text-red-600 hover:underline disabled:opacity-50"
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

    <NuxtLink :to="reportsBackTo" class="mt-6 inline-block text-sm font-medium text-surface-600 hover:text-primary-600">{{
      reportsBackLabel
    }}</NuxtLink>

    <Teleport to="body">
      <div v-if="showBuildReport" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showBuildReport = false">
        <div
          class="schedule-form-panel w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl ring-1 ring-white/10"
          @click.stop
        >
          <h3 class="text-lg font-semibold text-surface-900">Build your report</h3>
          <p class="mt-1 text-sm text-surface-500">
            Pick a site and a starting layout, then customize in the visual editor. Use <strong>View</strong> in the editor for a full-page preview
            and PDF layout. Report colors follow Agency settings.
          </p>
          <form class="mt-4 space-y-4" @submit.prevent="goToBuilder">
            <div>
              <label class="block text-sm font-medium text-surface-700">Site</label>
              <select v-model="buildReportSiteId" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
                <option value="">Select site</option>
                <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }} ({{ s.domain }})</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Starting point</label>
              <select v-model="buildReportLayout" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
                <option value="scratch">Start from scratch (cover + table of contents)</option>
                <option value="full">Full report template (GA, Ads, SEO, rankings &amp; more)</option>
                <option value="weekly_snapshot">Weekly Snapshot template (overview-style)</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Report name <span class="font-normal text-surface-500">(optional)</span></label>
              <input v-model="buildReportName" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" placeholder="e.g. Q1 client deck" />
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50" @click="showBuildReport = false">Cancel</button>
              <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500" :disabled="buildingReport">
                {{ buildingReport ? 'Creating…' : 'Continue to editor' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="reportToDuplicate"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="reportToDuplicate = null"
      >
        <div
          class="schedule-form-panel w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl ring-1 ring-white/10"
          @click.stop
        >
          <h3 class="text-lg font-semibold text-surface-900">Duplicate report</h3>
          <p class="mt-1 text-sm text-surface-500">
            Copy “{{ reportDisplayName(reportToDuplicate) }}” including layout and settings. Choose which site the copy should use—you can open the builder afterward to tweak anything.
          </p>
          <form class="mt-4 space-y-4" @submit.prevent="submitDuplicate">
            <div>
              <label class="block text-sm font-medium text-surface-700">Site for the copy</label>
              <select v-model="duplicateTargetSiteId" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
                <option value="">Select site</option>
                <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }} ({{ s.domain }})</option>
              </select>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
                @click="reportToDuplicate = null"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
                :disabled="duplicatingSubmitting || !duplicateTargetSiteId"
              >
                {{ duplicatingSubmitting ? 'Duplicating…' : 'Duplicate & open builder' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="reportToDelete" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="reportToDelete = null">
        <div
          class="schedule-form-panel w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl ring-1 ring-white/10"
          @click.stop
        >
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
import {
  buildWeeklySnapshotSections,
  LAYOUT_TEMPLATE_FULL,
  LAYOUT_TEMPLATE_WEEKLY_SNAPSHOT,
} from '~/utils/reportLayoutPresets'
import { buildFullReportPages, DEFAULT_THEME } from '~/utils/reportBuilderFactory'
import { serializeReportBuilder } from '~/utils/reportBuilderPayload'

const pb = usePocketbase()
const { plan, loading, freeOwnerHomePath, refreshPlan } = useSubscriptionPlan()

const hasAutomatedReports = computed(
  () => plan.value === 'growth' || plan.value === 'agency' || plan.value === 'comped',
)

const showAutomatedReportsUi = computed(() => plan.value !== null && hasAutomatedReports.value)

/** Free tier: one full report; show billing upgrade instead of create/duplicate. */
const showFreeReportUpgradeCta = computed(
  () => !loading.value && plan.value === 'free' && reports.value.length >= 1,
)

const reportsBackTo = computed(() => {
  if (plan.value === 'free' || plan.value === 'starter') {
    return freeOwnerHomePath.value || '/sites'
  }
  return '/dashboard'
})

const reportsBackLabel = computed(() => {
  if (plan.value === 'free' || plan.value === 'starter') {
    if (freeOwnerHomePath.value && freeOwnerHomePath.value !== '/sites') return '← Back to My Site'
    return '← Back to Sites'
  }
  return '← Back to Dashboard'
})

const reportsTab = ref<'manual' | 'automated'>('manual')
const sites = ref<SiteRecord[]>([])
const reports = ref<(Report & { expand?: { site?: SiteRecord } })[]>([])
const pending = ref(true)
const showBuildReport = ref(false)
const buildReportSiteId = ref('')
const buildReportName = ref('')
const buildReportLayout = ref<'scratch' | 'full' | 'weekly_snapshot'>('scratch')
const buildingReport = ref(false)
const reportToDelete = ref<(Report & { expand?: { site?: SiteRecord } }) | null>(null)
const deletingId = ref<string | null>(null)
const reportToDuplicate = ref<(Report & { expand?: { site?: SiteRecord } }) | null>(null)
const duplicateTargetSiteId = ref('')
const duplicatingId = ref<string | null>(null)
const duplicatingSubmitting = ref(false)

const pdfSiteIdRef = ref('')
const { exportPdf, error: reportPdfError } = useExportPdf(pdfSiteIdRef)
const pdfDownloadingForReportId = ref<string | null>(null)

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

async function goToBuilder() {
  if (!buildReportSiteId.value) return
  buildingReport.value = true
  try {
    const { report } = await $fetch<{ report: { id: string } }>('/api/reports/create', {
      method: 'POST',
      headers: authHeaders(),
      body: { siteId: buildReportSiteId.value },
    })
    const site = sites.value.find((s) => s.id === buildReportSiteId.value)
    const woo = (useRuntimeConfig().public as { woocommerceEnabled?: boolean }).woocommerceEnabled !== false
    const nameInput = buildReportName.value?.trim()
    const useWeeklySnapshot = buildReportLayout.value === 'weekly_snapshot'
    const useFullTemplate = buildReportLayout.value === 'full'
    if (useWeeklySnapshot) {
      const defaultName = site ? `Weekly Snapshot – ${site.name}` : 'Weekly Snapshot'
      await $fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: {
          payload_json: {
            name: nameInput || defaultName,
            layoutTemplateKey: LAYOUT_TEMPLATE_WEEKLY_SNAPSHOT,
            sections: buildWeeklySnapshotSections(woo),
            rangePreset: 'last_7_days',
            comparePreset: 'previous_period',
          },
        },
      })
    } else if (useFullTemplate) {
      const defaultName = nameInput || (site ? `Full report – ${site.name}` : 'Full report')
      const pages = buildFullReportPages(defaultName, woo)
      const builderSeed = serializeReportBuilder({
        id: report.id,
        title: defaultName,
        subtitle: '',
        internalNotes: '',
        theme: { ...DEFAULT_THEME },
        pages,
      })
      await $fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: {
          payload_json: {
            ...builderSeed,
            layoutTemplateKey: LAYOUT_TEMPLATE_FULL,
            rangePreset: 'last_28_days',
            comparePreset: 'previous_period',
          },
        },
      })
    } else if (nameInput) {
      await $fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: { payload_json: { name: nameInput } },
      })
    } else if (site) {
      await $fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: { payload_json: { name: `Visual report – ${site.name}` } },
      })
    }
    const newReportId = String(report.id)
    showBuildReport.value = false
    buildReportSiteId.value = ''
    buildReportName.value = ''
    buildReportLayout.value = 'scratch'
    await navigateTo({ path: `/reports/${newReportId}/builder` })
    void loadReports()
  } catch {
    // leave modal open
  } finally {
    buildingReport.value = false
  }
}

function reportSiteId(r: Report & { expand?: { site?: SiteRecord } }): string {
  if (typeof r.site === 'string') return r.site
  return r.expand?.site?.id ?? ''
}

async function downloadReportPdf(r: Report & { expand?: { site?: SiteRecord } }) {
  const siteId = reportSiteId(r)
  if (!siteId || !r.id) return
  pdfSiteIdRef.value = siteId
  pdfDownloadingForReportId.value = r.id
  await nextTick()
  try {
    await exportPdf('last_28_days', 'previous_period', true, r.id)
    if (reportPdfError.value) {
      window.alert(reportPdfError.value)
    }
  } finally {
    pdfDownloadingForReportId.value = null
  }
}

function openDuplicateModal(r: Report & { expand?: { site?: SiteRecord } }) {
  reportToDuplicate.value = r
  duplicateTargetSiteId.value = reportSiteId(r) || (sites.value[0]?.id ?? '')
}

async function submitDuplicate() {
  const src = reportToDuplicate.value
  if (!src || !duplicateTargetSiteId.value) return
  duplicatingSubmitting.value = true
  duplicatingId.value = src.id
  try {
    const { report } = await $fetch<{ report: { id: string } }>(`/api/reports/${src.id}/duplicate`, {
      method: 'POST',
      headers: authHeaders(),
      body: { siteId: duplicateTargetSiteId.value },
    })
    reportToDuplicate.value = null
    duplicateTargetSiteId.value = ''
    await loadReports()
    await navigateTo(`/reports/${report.id}/builder`)
  } catch {
    // leave modal open
  } finally {
    duplicatingSubmitting.value = false
    duplicatingId.value = null
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

watch(showAutomatedReportsUi, (allowed) => {
  if (!allowed && reportsTab.value === 'automated') reportsTab.value = 'manual'
})

onMounted(async () => {
  await refreshPlan()
  try {
    const { sites: list } = await listSites(pb)
    sites.value = list
    await loadReports()
  } catch {
    reports.value = []
  } finally {
    pending.value = false
  }
})
</script>
