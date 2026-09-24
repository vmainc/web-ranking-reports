<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold text-white">Workspace</h1>
      <p class="mt-1 text-sm text-slate-400">Pipeline and site audits for this agency.</p>
    </div>

    <nav class="mt-6 inline-flex flex-wrap gap-1 rounded-lg border border-slate-700 bg-slate-900/60 p-1 text-sm" aria-label="Workspace sections">
      <button
        type="button"
        class="rounded-md px-4 py-2 font-medium"
        :class="activeTab === 'pipeline' ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'"
        @click="setTab('pipeline')"
      >
        Pipeline
      </button>
      <button
        type="button"
        class="rounded-md px-4 py-2 font-medium"
        :class="activeTab === 'site-audits' ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'"
        @click="setTab('site-audits')"
      >
        Site Audits
      </button>
    </nav>

    <div class="mt-6">
      <CrmPipelineBoard v-show="activeTab === 'pipeline'" />

      <section v-show="activeTab === 'site-audits'">
        <p v-if="sitesError" class="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {{ sitesError }}
        </p>
        <p v-else-if="sitesPending" class="text-sm text-slate-400">Loading site audits…</p>
        <p v-else-if="!sites.length" class="rounded-xl border border-slate-700/70 bg-slate-900/40 px-5 py-8 text-sm text-slate-500">
          No sites in this workspace yet.
        </p>
        <div v-else class="overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/40">
          <table class="min-w-full divide-y divide-slate-700/60 text-left text-sm">
            <thead class="bg-slate-800/50 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th class="px-5 py-3">Site</th>
                <th class="px-5 py-3">Last audit</th>
                <th class="px-5 py-3">Findings</th>
                <th class="px-5 py-3 text-right"> </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/60">
              <tr v-for="site in sites" :key="site.id">
                <td class="px-5 py-3">
                  <p class="font-medium text-white">{{ site.name }}</p>
                  <p class="text-slate-400">{{ site.domain }}</p>
                </td>
                <td class="px-5 py-3 text-slate-300">
                  {{ auditWhen(site) }}
                </td>
                <td class="px-5 py-3 text-slate-300">
                  {{ auditFindings(site) }}
                </td>
                <td class="px-5 py-3 text-right">
                  <NuxtLink :to="`/sites/${site.id}/site-audit`" class="font-medium text-blue-400 hover:text-blue-300">
                    {{ site.site_audit_result ? 'Open' : 'Run audit' }}
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SiteAuditResult } from '~/types'

definePageMeta({ layout: 'default' })

type WorkspaceTab = 'pipeline' | 'site-audits'
type AuditSite = {
  id: string
  name: string
  domain: string
  site_audit_result?: SiteAuditResult | null
}

const route = useRoute()
const router = useRouter()

function tabFromQuery(value: unknown): WorkspaceTab {
  return value === 'site-audits' ? 'site-audits' : 'pipeline'
}

const activeTab = ref<WorkspaceTab>(tabFromQuery(route.query.tab))
const sites = ref<AuditSite[]>([])
const sitesPending = ref(false)
const sitesError = ref('')
const sitesLoaded = ref(false)

function setTab(tab: WorkspaceTab) {
  activeTab.value = tab
  const query = { ...route.query }
  if (tab === 'pipeline') delete query.tab
  else query.tab = tab
  void router.replace({ query })
}

watch(
  () => route.query.tab,
  (value) => {
    activeTab.value = tabFromQuery(value)
  },
)

function authHeaders(): Record<string, string> {
  const pb = usePocketbase()
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function auditWhen(site: AuditSite): string {
  const iso = site.site_audit_result?.fetchedAt
  if (!iso) return 'Not run'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Not run'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function auditFindings(site: AuditSite): string {
  const issues = site.site_audit_result?.issues
  if (!issues) return '—'
  if (!issues.length) return 'No issues'
  const errors = issues.filter((issue) => issue.severity === 'error').length
  const warnings = issues.filter((issue) => issue.severity === 'warning').length
  const parts: string[] = []
  if (errors) parts.push(`${errors} error${errors === 1 ? '' : 's'}`)
  if (warnings) parts.push(`${warnings} warning${warnings === 1 ? '' : 's'}`)
  return parts.length ? parts.join(' · ') : `${issues.length} note${issues.length === 1 ? '' : 's'}`
}

async function loadSites() {
  if (sitesLoaded.value || sitesPending.value) return
  sitesPending.value = true
  sitesError.value = ''
  try {
    const res = await $fetch<{ sites?: AuditSite[] }>('/api/workspace/sites', { headers: authHeaders() })
    sites.value = res.sites ?? []
    sitesLoaded.value = true
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    sitesError.value = err?.data?.message || err?.message || 'Could not load site audits.'
  } finally {
    sitesPending.value = false
  }
}

watch(
  activeTab,
  (tab) => {
    if (tab === 'site-audits') void loadSites()
  },
  { immediate: true },
)
</script>
