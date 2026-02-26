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
        <h1 class="text-2xl font-semibold text-surface-900">Site audit</h1>
        <p class="mt-1 text-sm text-surface-500">
          Technical and SEO health checks for {{ site.domain }}.
        </p>
      </div>

      <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <p class="mb-4 text-sm text-surface-600">
          Run an AI-powered technical SEO audit. The tool fetches your homepage and analyses crawlability, indexing, performance, on-page SEO, and more.
        </p>
        <button
          type="button"
          class="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:opacity-50"
          :disabled="running"
          @click="runAudit"
        >
          {{ running ? 'Running audit…' : result ? 'Run again' : 'Run audit' }}
        </button>
        <div v-if="running" class="mt-4" role="status" aria-label="Audit in progress">
          <p class="mb-2 text-sm font-medium text-surface-700">Audit in progress…</p>
          <div class="audit-progress-track h-2 w-full overflow-hidden rounded-full bg-surface-200">
            <div class="audit-progress-bar h-full w-1/3 rounded-full bg-primary-500" />
          </div>
        </div>
      </section>

      <div v-if="auditError" class="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {{ auditError }}
        <p v-if="auditError.includes('not configured')" class="mt-2">
          <NuxtLink to="/admin/integrations" class="font-medium underline">Admin → Integrations</NuxtLink>
          → add your Claude API key under “Claude (Site Audit)”.
        </p>
      </div>

      <template v-if="result">
        <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
          <h2 class="mb-3 text-lg font-semibold text-surface-900">Summary</h2>
          <p class="max-w-3xl text-sm leading-relaxed text-surface-700">{{ result.summary }}</p>
          <p class="mt-4 text-xs text-surface-500">Audited {{ result.url }} · {{ formatDate(result.fetchedAt) }}</p>
        </section>

        <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-surface-900">Findings</h2>
            <div v-if="result.issues.length" class="flex flex-wrap gap-2">
              <span v-if="issuesBySeverity.error.length" class="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                {{ issuesBySeverity.error.length }} error{{ issuesBySeverity.error.length !== 1 ? 's' : '' }}
              </span>
              <span v-if="issuesBySeverity.warning.length" class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                {{ issuesBySeverity.warning.length }} warning{{ issuesBySeverity.warning.length !== 1 ? 's' : '' }}
              </span>
              <span v-if="issuesBySeverity.info.length" class="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">
                {{ issuesBySeverity.info.length }} info
              </span>
            </div>
          </div>
          <p v-if="!result.issues.length" class="text-sm text-surface-500">No issues reported.</p>
          <div v-else class="space-y-4">
            <div
              v-for="issue in result.issues"
              :key="issue.id"
              class="rounded-xl border p-5 shadow-sm transition"
              :class="severityBorderClass(issue.severity)"
            >
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
                  :class="severityBadgeClass(issue.severity)"
                >
                  {{ issue.severity }}
                </span>
                <span class="rounded bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-600">{{ formatArea(issue.area) }}</span>
              </div>
              <h3 class="mt-3 text-base font-semibold text-surface-900">{{ issue.title }}</h3>
              <p class="mt-2 text-sm leading-relaxed text-surface-600">{{ issue.description }}</p>
              <div class="mt-4 rounded-lg border border-surface-200 bg-white/60 p-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-surface-500">Recommendation</p>
                <p class="mt-1 text-sm leading-relaxed text-surface-800">{{ issue.recommendation }}</p>
              </div>
            </div>
          </div>
        </section>
      </template>
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

interface AuditIssue {
  id: string
  severity: 'error' | 'warning' | 'info'
  area: string
  title: string
  description: string
  recommendation: string
}

interface AuditResult {
  url: string
  fetchedAt: string
  summary: string
  issues: AuditIssue[]
}

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()
const site = ref<SiteRecord | null>(null)
const pending = ref(true)
const running = ref(false)
const auditError = ref('')
const result = ref<AuditResult | null>(null)

const issuesBySeverity = computed(() => {
  const issues = result.value?.issues ?? []
  return {
    error: issues.filter((i) => i.severity === 'error'),
    warning: issues.filter((i) => i.severity === 'warning'),
    info: issues.filter((i) => i.severity === 'info'),
  }
})

function formatArea(area: string): string {
  return area.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function severityBadgeClass(severity: string): string {
  if (severity === 'error') return 'bg-red-100 text-red-800'
  if (severity === 'warning') return 'bg-amber-100 text-amber-800'
  return 'bg-sky-100 text-sky-800'
}

function severityBorderClass(severity: string): string {
  if (severity === 'error') return 'border-red-200 bg-red-50/50'
  if (severity === 'warning') return 'border-amber-200 bg-amber-50/50'
  return 'border-surface-200 bg-surface-50/50'
}

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

async function runAudit() {
  if (!site.value) return
  running.value = true
  auditError.value = ''
  try {
    const data = await $fetch<AuditResult>('/api/site-audit/run', {
      method: 'POST',
      body: { siteId: site.value.id },
      headers: authHeaders(),
    })
    result.value = data
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    auditError.value = err?.data?.message ?? err?.message ?? 'Audit failed.'
  } finally {
    running.value = false
  }
}

async function init() {
  pending.value = true
  result.value = null
  try {
    site.value = await getSite(pb, siteId.value)
    if (!site.value) return
    try {
      const { result: saved } = await $fetch<{ result: AuditResult | null }>(
        `/api/site-audit/${site.value.id}`,
        { headers: authHeaders() }
      )
      if (saved && typeof saved.summary === 'string' && Array.isArray(saved.issues)) {
        result.value = saved
      }
    } catch {
      // Fallback: use site record if GET fails (e.g. old client)
      if (site.value?.site_audit_result) {
        result.value = site.value.site_audit_result as AuditResult
      }
    }
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>

<style scoped>
.audit-progress-track {
  position: relative;
}
.audit-progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  animation: audit-slide 1.8s ease-in-out infinite;
}
@keyframes audit-slide {
  0%,
  100% {
    left: 0;
  }
  50% {
    left: calc(100% - 33.333%);
  }
}
</style>
