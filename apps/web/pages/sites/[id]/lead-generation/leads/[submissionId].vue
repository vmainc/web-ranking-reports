<template>
  <LeadGenerationLayout>
    <div v-if="pending" class="py-8 text-center text-surface-500">Loading lead…</div>
    <template v-else-if="lead">
      <div class="space-y-8">
        <NuxtLink :to="`/sites/${siteId}/lead-generation/leads`" class="text-sm font-medium text-surface-500 hover:text-primary-600">← Back to leads</NuxtLink>
        <section class="rounded-2xl border border-surface-200 bg-white p-6">
          <h2 class="mb-4 text-lg font-semibold text-surface-900">Lead info</h2>
          <dl class="grid gap-3 sm:grid-cols-2">
            <div><dt class="text-xs font-medium text-surface-500">Name</dt><dd class="mt-0.5 text-surface-900">{{ lead.lead_name || '—' }}</dd></div>
            <div><dt class="text-xs font-medium text-surface-500">Email</dt><dd class="mt-0.5 text-surface-900">{{ lead.lead_email || '—' }}</dd></div>
            <div><dt class="text-xs font-medium text-surface-500">Phone</dt><dd class="mt-0.5 text-surface-900">{{ lead.lead_phone || '—' }}</dd></div>
            <div><dt class="text-xs font-medium text-surface-500">Website</dt><dd class="mt-0.5"><a v-if="lead.lead_website" :href="lead.lead_website" target="_blank" rel="noopener" class="text-primary-600 hover:underline">{{ lead.lead_website }}</a><span v-else>—</span></dd></div>
            <div class="sm:col-span-2"><dt class="text-xs font-medium text-surface-500">Submitted</dt><dd class="mt-0.5 text-surface-900">{{ formatDate(lead.submitted_at) }}</dd></div>
            <div v-if="lead.payload_json && Object.keys(lead.payload_json).length" class="sm:col-span-2"><dt class="text-xs font-medium text-surface-500">All fields</dt><dd class="mt-1 rounded bg-surface-50 p-3 font-mono text-sm"><pre>{{ JSON.stringify(lead.payload_json, null, 2) }}</pre></dd></div>
          </dl>
        </section>
        <section v-if="audit" class="space-y-6">
          <h2 class="text-lg font-semibold text-surface-900">Audit results</h2>
          <div v-if="audit.onPage" class="rounded-2xl border border-surface-200 bg-white p-6">
            <h3 class="mb-4 font-medium">On-page snapshot</h3>
            <dl class="grid gap-2 text-sm sm:grid-cols-2">
              <template v-if="(audit.onPage as OnPage).title"><dt class="text-surface-500">Title</dt><dd>{{ (audit.onPage as OnPage).title }} ({{ (audit.onPage as OnPage).titleLength }} chars)</dd></template>
              <template v-if="(audit.onPage as OnPage).metaDescription"><dt class="text-surface-500">Meta description</dt><dd>{{ (audit.onPage as OnPage).metaDescription }} ({{ (audit.onPage as OnPage).metaDescriptionLength }} chars)</dd></template>
              <dt class="text-surface-500">H1</dt><dd>{{ (audit.onPage as OnPage).h1 ?? '—' }} (count: {{ (audit.onPage as OnPage).h1Count }})</dd>
              <dt class="text-surface-500">H2 / H3</dt><dd>{{ (audit.onPage as OnPage).h2Count }} / {{ (audit.onPage as OnPage).h3Count }}</dd>
              <dt class="text-surface-500">Word count</dt><dd>{{ (audit.onPage as OnPage).wordCount }}</dd>
              <template v-if="(audit.onPage as OnPage).issues?.length"><dt class="text-surface-500">Issues</dt><dd><ul class="list-disc pl-4"><li v-for="(issue, i) in (audit.onPage as OnPage).issues" :key="i">{{ issue }}</li></ul></dd></template>
            </dl>
          </div>
          <p v-else-if="audit.onPageError" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">On-page error: {{ audit.onPageError }}</p>
          <div v-if="audit.lighthouseMobile || audit.lighthouseDesktop" class="rounded-2xl border border-surface-200 bg-white p-6">
            <h3 class="mb-4 font-medium">Lighthouse</h3>
            <div class="grid gap-4 sm:grid-cols-2">
              <div v-if="audit.lighthouseMobile" class="rounded-xl border border-surface-200 p-4"><p class="mb-2 text-sm font-medium text-surface-600">Mobile</p><div class="flex flex-wrap gap-2"><span v-for="(cat, id) in (audit.lighthouseMobile as Lh).categories" :key="id" class="rounded bg-surface-100 px-2 py-1 text-sm">{{ id }}: {{ scorePct((cat as { score?: number }).score) }}</span></div></div>
              <div v-if="audit.lighthouseDesktop" class="rounded-xl border border-surface-200 p-4"><p class="mb-2 text-sm font-medium text-surface-600">Desktop</p><div class="flex flex-wrap gap-2"><span v-for="(cat, id) in (audit.lighthouseDesktop as Lh).categories" :key="id" class="rounded bg-surface-100 px-2 py-1 text-sm">{{ id }}: {{ scorePct((cat as { score?: number }).score) }}</span></div></div>
            </div>
          </div>
        </section>
        <div class="flex gap-2">
          <button type="button" class="rounded-lg border border-surface-300 px-3 py-1.5 text-sm font-medium hover:bg-surface-50 disabled:opacity-50" :disabled="runningAudit" @click="runAudit">{{ runningAudit ? 'Running…' : 'Re-run audit' }}</button>
        </div>
      </div>
    </template>
    <div v-else class="py-8 text-center text-surface-500">Lead not found.</div>
  </LeadGenerationLayout>
</template>

<script setup lang="ts">
import type { LeadSubmission } from '~/types'
interface OnPage { title?: string; titleLength?: number; metaDescription?: string; metaDescriptionLength?: number; h1?: string; h1Count?: number; h2Count?: number; h3Count?: number; wordCount?: number; issues?: string[] }
interface Lh { categories?: Record<string, { score?: number }> }
const route = useRoute()
const pb = usePocketbase()
const siteId = computed(() => route.params.id as string)
const submissionId = computed(() => route.params.submissionId as string)
const lead = ref<LeadSubmission | null>(null)
const pending = ref(true)
const runningAudit = ref(false)
const audit = computed(() => (lead.value?.audit_json as Record<string, unknown>) ?? null)
function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}
function formatDate(iso: string) { if (!iso) return '—'; try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) } catch { return iso } }
function scorePct(s: number | undefined) { if (s == null) return '—'; return Math.round((s ?? 0) * 100) + '%' }
async function load() { pending.value = true; try { lead.value = await $fetch<LeadSubmission>(`/api/sites/${siteId.value}/leads/${submissionId.value}`, { headers: authHeaders() }) } catch { lead.value = null } finally { pending.value = false } }
async function runAudit() { runningAudit.value = true; try { await $fetch(`/api/sites/${siteId.value}/leads/${submissionId.value}/run-audit`, { method: 'POST', headers: authHeaders() }); await load() } catch (e: unknown) { alert((e as { data?: { message?: string }; message?: string })?.data?.message || (e as Error).message || 'Audit failed') } finally { runningAudit.value = false } }
onMounted(() => load())
watch(submissionId, () => load())
</script>
