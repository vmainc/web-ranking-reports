<template>
  <div class="mb-10">
    <div class="mb-4">
      <h2 class="text-lg font-semibold text-white">Prospect audit</h2>
      <p class="mt-1 max-w-3xl text-sm text-slate-400">
        Drop in a domain to pull PageSpeed (mobile + desktop), WHOIS, tech stack, on-page SEO, AI crawl files,
        ranked keywords, and a technical SEO review — then save to a board or convert to a Sales lead.
      </p>
    </div>

    <section class="mb-6 rounded-xl border border-slate-700/70 bg-slate-900/50 p-6 shadow-sm">
      <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="runAudit">
        <div class="min-w-[260px] flex-1">
          <label for="prospect-domain" class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Domain
          </label>
          <input
            id="prospect-domain"
            v-model="domainInput"
            type="text"
            class="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="e.g. prospect.com"
          />
        </div>
        <button
          type="submit"
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
          :disabled="running || !domainInput.trim()"
        >
          {{ running ? 'Running audit…' : 'Run prospect audit' }}
        </button>
      </form>
      <p v-if="running" class="mt-3 text-xs text-slate-500">
        Gathering PageSpeed, WHOIS, tech, keywords, and SEO signals. This can take 1–2 minutes.
      </p>
      <p v-if="error" class="mt-3 text-sm text-rose-300">{{ error }}</p>
    </section>

    <div v-if="pending && !audits.length" class="py-10 text-center text-slate-500">Loading audits…</div>

    <section
      v-for="audit in audits"
      :key="audit.id"
      class="mb-6 rounded-xl border border-slate-700/70 bg-slate-900/50 p-6 shadow-sm"
    >
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-lg font-medium text-white">{{ audit.domain }}</h3>
            <span
              class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="audit.status === 'ready'
                ? 'bg-emerald-500/20 text-emerald-200'
                : audit.status === 'partial'
                  ? 'bg-amber-500/20 text-amber-200'
                  : 'bg-rose-500/20 text-rose-200'"
            >
              {{ audit.status }}
            </span>
            <NuxtLink
              v-if="audit.leadId"
              :to="`/crm/clients/${audit.leadId}`"
              class="inline-flex rounded-full bg-sky-500/20 px-2 py-0.5 text-xs font-semibold text-sky-200 hover:underline"
            >
              In Sales
            </NuxtLink>
          </div>
          <p class="text-xs text-slate-500">Updated {{ formatDate(audit.updatedAt) }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            @click="openSave(audit)"
          >
            Save to board
          </button>
          <button
            v-if="!audit.leadId"
            type="button"
            class="rounded-lg border border-primary-500/50 bg-primary-600/15 px-3 py-2 text-sm font-semibold text-primary-200 hover:bg-primary-600/25"
            @click="openConvert(audit)"
          >
            Convert to lead
          </button>
          <NuxtLink
            v-else
            :to="`/crm/sales`"
            class="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-500/20"
          >
            Open Sales
          </NuxtLink>
        </div>
      </div>

      <div v-if="audit.talkingPoints?.length" class="mb-5 rounded-lg border border-slate-700 bg-slate-950/50 p-4">
        <h4 class="mb-2 text-sm font-semibold text-white">Talking points</h4>
        <ul class="list-disc space-y-1 pl-5 text-sm text-slate-300">
          <li v-for="point in audit.talkingPoints" :key="point">{{ point }}</li>
        </ul>
      </div>

      <div class="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
          <p class="text-xs uppercase tracking-wide text-slate-500">Mobile lab</p>
          <p class="mt-1 text-2xl font-semibold" :class="scoreTone(audit.lighthouseMobile?.scores.performance)">
            {{ audit.lighthouseMobile?.scores.performance ?? '—' }}
          </p>
          <p class="mt-1 text-xs text-slate-500">
            SEO {{ audit.lighthouseMobile?.scores.seo ?? '—' }}
            · lab LCP {{ audit.lighthouseMobile?.metrics.lcp || '—' }}
          </p>
          <p v-if="cruxLine(audit.lighthouseMobile)" class="mt-1 text-xs text-sky-300">
            {{ cruxLine(audit.lighthouseMobile) }}
          </p>
        </div>
        <div class="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
          <p class="text-xs uppercase tracking-wide text-slate-500">Desktop lab</p>
          <p class="mt-1 text-2xl font-semibold" :class="scoreTone(audit.lighthouseDesktop?.scores.performance)">
            {{ audit.lighthouseDesktop?.scores.performance ?? '—' }}
          </p>
          <p class="mt-1 text-xs text-slate-500">
            SEO {{ audit.lighthouseDesktop?.scores.seo ?? '—' }}
            · lab LCP {{ audit.lighthouseDesktop?.metrics.lcp || '—' }}
          </p>
          <p v-if="cruxLine(audit.lighthouseDesktop)" class="mt-1 text-xs text-sky-300">
            {{ cruxLine(audit.lighthouseDesktop) }}
          </p>
        </div>
        <div class="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
          <p class="text-xs uppercase tracking-wide text-slate-500">Domain age</p>
          <p class="mt-1 text-2xl font-semibold text-white">
            {{ audit.whois?.whois?.domainAgeYears != null ? `${audit.whois.whois.domainAgeYears}y` : '—' }}
          </p>
          <p class="mt-1 truncate text-xs text-slate-500">{{ audit.whois?.whois?.registrar || 'WHOIS' }}</p>
        </div>
        <div class="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
          <p class="text-xs uppercase tracking-wide text-slate-500">Keywords shown</p>
          <p class="mt-1 text-2xl font-semibold text-white">{{ audit.keywords?.items?.length ?? '—' }}</p>
          <p class="mt-1 text-xs text-slate-500">
            {{ audit.keywords?.totalKeywordCount != null ? `~${audit.keywords.totalKeywordCount.toLocaleString()} total` : 'Ranked keywords' }}
          </p>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-lg border border-slate-700 bg-slate-950/30 p-4">
          <h4 class="mb-2 text-sm font-semibold text-white">Tech stack</h4>
          <div v-if="audit.tech?.detected?.length" class="flex flex-wrap gap-2">
            <span
              v-for="t in audit.tech.detected"
              :key="t.id"
              class="rounded-full border border-slate-600 bg-slate-900 px-2.5 py-1 text-xs text-slate-200"
            >
              {{ t.name }}
            </span>
          </div>
          <p v-else class="text-sm text-slate-500">{{ audit.errors.tech || 'None detected' }}</p>
        </div>

        <div class="rounded-lg border border-slate-700 bg-slate-950/30 p-4">
          <h4 class="mb-2 text-sm font-semibold text-white">AI crawl readiness</h4>
          <ul v-if="audit.aiCrawl" class="space-y-1 text-sm text-slate-300">
            <li>llms.txt — {{ audit.aiCrawl.llmsTxt.found ? 'found' : 'missing' }}</li>
            <li>llm.txt — {{ audit.aiCrawl.llmTxt.found ? 'found' : 'missing' }}</li>
            <li>robots.txt — {{ audit.aiCrawl.robotsTxt.found ? 'found' : 'missing' }}</li>
          </ul>
          <div v-if="audit.aiCrawl?.robotsTxt.aiBots?.length" class="mt-2 flex flex-wrap gap-1.5">
            <span
              v-for="bot in audit.aiCrawl.robotsTxt.aiBots"
              :key="bot.name"
              class="rounded px-1.5 py-0.5 text-[10px] font-medium"
              :class="bot.allowed === false
                ? 'bg-rose-500/20 text-rose-200'
                : bot.allowed === true
                  ? 'bg-emerald-500/15 text-emerald-200'
                  : 'bg-slate-800 text-slate-400'"
            >
              {{ bot.name }}
            </span>
          </div>
          <p v-else-if="audit.errors.aiCrawl" class="text-sm text-slate-500">{{ audit.errors.aiCrawl }}</p>
        </div>

        <div class="rounded-lg border border-slate-700 bg-slate-950/30 p-4">
          <h4 class="mb-2 text-sm font-semibold text-white">WHOIS</h4>
          <dl v-if="audit.whois?.whois" class="space-y-1 text-sm text-slate-300">
            <div v-if="audit.whois.whois.registrantOrg"><dt class="inline text-slate-500">Org:</dt> {{ audit.whois.whois.registrantOrg }}</div>
            <div v-if="audit.whois.whois.createdAt"><dt class="inline text-slate-500">Created:</dt> {{ audit.whois.whois.createdAt }}</div>
            <div v-if="audit.whois.whois.expiresAt"><dt class="inline text-slate-500">Expires:</dt> {{ audit.whois.whois.expiresAt }}</div>
            <div v-if="audit.whois.dns?.a?.length"><dt class="inline text-slate-500">A:</dt> {{ audit.whois.dns.a.slice(0, 3).join(', ') }}</div>
          </dl>
          <p v-else class="text-sm text-slate-500">{{ audit.errors.whois || 'No WHOIS data' }}</p>
        </div>

        <div class="rounded-lg border border-slate-700 bg-slate-950/30 p-4">
          <h4 class="mb-2 text-sm font-semibold text-white">On-page</h4>
          <div v-if="audit.onPage" class="space-y-1 text-sm text-slate-300">
            <p><span class="text-slate-500">Title:</span> {{ audit.onPage.title || '—' }}</p>
            <p><span class="text-slate-500">Meta:</span> {{ audit.onPage.metaDescription || '—' }}</p>
            <p v-if="audit.onPage.issues?.length" class="text-amber-200">{{ audit.onPage.issues.join(' · ') }}</p>
          </div>
          <p v-else class="text-sm text-slate-500">{{ audit.errors.onPage || 'No on-page data' }}</p>
        </div>
      </div>

      <div v-if="audit.claudeAudit" class="mt-4 rounded-lg border border-slate-700 bg-slate-950/30 p-4">
        <h4 class="mb-2 text-sm font-semibold text-white">Technical SEO review</h4>
        <p class="mb-3 text-sm text-slate-300">{{ audit.claudeAudit.summary }}</p>
        <ul class="space-y-2">
          <li
            v-for="issue in (audit.claudeAudit.issues || []).slice(0, 8)"
            :key="issue.id"
            class="rounded border border-slate-700/80 bg-slate-950/50 px-3 py-2 text-sm"
          >
            <p class="font-medium text-white">
              <span
                class="mr-2 text-xs uppercase"
                :class="issue.severity === 'error' ? 'text-rose-300' : issue.severity === 'warning' ? 'text-amber-300' : 'text-slate-400'"
              >{{ issue.severity }}</span>
              {{ issue.title }}
            </p>
            <p class="mt-1 text-slate-400">{{ issue.recommendation }}</p>
          </li>
        </ul>
      </div>
      <p v-else-if="audit.errors.claudeAudit" class="mt-4 text-sm text-slate-500">{{ audit.errors.claudeAudit }}</p>

      <div v-if="audit.keywords?.items?.length" class="mt-4 overflow-x-auto rounded-lg border border-slate-700">
        <table class="min-w-full divide-y divide-slate-700 text-left text-sm">
          <thead class="bg-slate-950/70">
            <tr>
              <th class="px-4 py-3 font-medium text-slate-300">Keyword</th>
              <th class="px-4 py-3 font-medium text-slate-300">Position</th>
              <th class="px-4 py-3 font-medium text-slate-300">Volume</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800">
            <tr v-for="row in audit.keywords.items.slice(0, 25)" :key="row.keyword">
              <td class="px-4 py-2 font-medium text-white">{{ row.keyword }}</td>
              <td class="px-4 py-2 text-primary-300">#{{ row.position }}</td>
              <td class="px-4 py-2 text-slate-300">{{ row.searchVolume != null ? row.searchVolume.toLocaleString() : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else-if="audit.errors.keywords" class="mt-4 text-sm text-slate-500">{{ audit.errors.keywords }}</p>

      <details v-if="Object.keys(audit.errors || {}).length" class="mt-4">
        <summary class="cursor-pointer text-xs text-slate-500">Module errors ({{ Object.keys(audit.errors).length }})</summary>
        <ul class="mt-2 space-y-1 text-xs text-slate-500">
          <li v-for="(msg, key) in audit.errors" :key="key">{{ key }}: {{ msg }}</li>
        </ul>
      </details>
    </section>

    <section
      v-if="!pending && !audits.length && !running"
      class="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-5 py-10 text-center"
    >
      <p class="text-sm text-slate-400">
        No prospect audits yet. Enter a domain above to generate a sales-ready snapshot.
      </p>
    </section>

    <SaveAuditToBoardModal v-model="saveOpen" :audit="activeAudit" :notes="activeNotes" />
    <ConvertAuditToLeadModal
      v-model="convertOpen"
      :audit="activeAudit"
      :default-name="defaultLeadName"
      @converted="onConverted"
    />
  </div>
</template>

<script setup lang="ts">
import type { ProspectAudit, ProspectLighthouseSummary } from '~/utils/prospectAudit'
import { scoreTone } from '~/utils/prospectAudit'
import { pickCruxExperience } from '~/utils/pagespeedCrux'

const pb = usePocketbase()
const pending = ref(true)
const running = ref(false)
const error = ref('')
const domainInput = ref('')
const audits = ref<ProspectAudit[]>([])
const saveOpen = ref(false)
const convertOpen = ref(false)
const activeAudit = ref<ProspectAudit | null>(null)
const activeNotes = ref('')

const defaultLeadName = computed(() => {
  const a = activeAudit.value
  if (!a) return ''
  return a.whois?.whois?.registrantOrg?.trim() || a.domain
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

function cruxLine(summary?: ProspectLighthouseSummary | null): string {
  const picked = pickCruxExperience(summary || null)
  if (!picked) return ''
  const lcp = picked.experience.metrics.find((m) => m.label === 'LCP')?.displayValue
  const inp = picked.experience.metrics.find((m) => m.label === 'INP')?.displayValue
  const cls = picked.experience.metrics.find((m) => m.label === 'CLS')?.displayValue
  const bits = [
    lcp ? `LCP ${lcp}` : null,
    inp ? `INP ${inp}` : null,
    cls ? `CLS ${cls}` : null,
  ].filter(Boolean)
  if (!bits.length) return picked.experience.overallCategory ? `Real users: ${picked.experience.overallCategory}` : ''
  return `Real users: ${bits.join(' · ')}`
}

async function loadAudits() {
  pending.value = true
  error.value = ''
  try {
    const res = await $fetch<{ audits: ProspectAudit[] }>('/api/workspace/prospect-audits', {
      headers: authHeaders(),
    })
    audits.value = res.audits ?? []
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Could not load audits.'
  } finally {
    pending.value = false
  }
}

async function runAudit() {
  if (!domainInput.value.trim()) return
  running.value = true
  error.value = ''
  try {
    const res = await $fetch<{ audit: ProspectAudit; audits: ProspectAudit[] }>('/api/workspace/prospect-audits', {
      method: 'POST',
      headers: authHeaders(),
      body: { domain: domainInput.value.trim(), keywordLimit: 50 },
      timeout: 180_000,
    })
    audits.value = res.audits ?? [res.audit]
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Prospect audit failed.'
  } finally {
    running.value = false
  }
}

async function fetchAuditNotes(audit: ProspectAudit): Promise<string> {
  // Notes are formatted server-side on convert; for board save rebuild a concise client summary.
  const lines: string[] = [`Prospect audit: ${audit.domain}`, `Status: ${audit.status}`, '']
  for (const p of audit.talkingPoints || []) lines.push(`- ${p}`)
  if (audit.lighthouseMobile) {
    const s = audit.lighthouseMobile.scores
    lines.push('', `Mobile PageSpeed: Perf ${s.performance ?? '—'} · SEO ${s.seo ?? '—'}`)
  }
  if (audit.lighthouseDesktop) {
    const s = audit.lighthouseDesktop.scores
    lines.push(`Desktop PageSpeed: Perf ${s.performance ?? '—'} · SEO ${s.seo ?? '—'}`)
  }
  if (audit.tech?.detected?.length) lines.push('', `Tech: ${audit.tech.detected.map((t) => t.name).join(', ')}`)
  if (audit.claudeAudit?.summary) lines.push('', audit.claudeAudit.summary)
  return lines.join('\n').trim()
}

async function openSave(audit: ProspectAudit) {
  activeAudit.value = audit
  activeNotes.value = await fetchAuditNotes(audit)
  saveOpen.value = true
}

function openConvert(audit: ProspectAudit) {
  activeAudit.value = audit
  convertOpen.value = true
}

function onConverted(payload: { clientId: string; audits: ProspectAudit[] }) {
  audits.value = payload.audits
  navigateTo(`/crm/clients/${payload.clientId}`)
}

onMounted(() => loadAudits())
</script>
