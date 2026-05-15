<template>
  <SiteIntegrationShell max-width="5xl">
    <div v-if="pending" class="flex justify-center py-12">
      <p class="text-slate-400">Loading…</p>
    </div>

    <template v-else-if="site">
      <div class="mb-10">
        <NuxtLink
          :to="`/sites/${site.id}`"
          class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-400 transition hover:text-[#3b82f6]"
        >
          ← {{ site.name }}
        </NuxtLink>
        <h1 class="text-2xl font-bold tracking-tight text-white sm:text-3xl">Lighthouse</h1>
        <p class="mt-1 text-sm text-slate-400">Performance, accessibility, best practices, and SEO scores.</p>
      </div>

      <!-- Not connected -->
      <div
        v-if="!lighthouseConnected"
        class="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-6 text-amber-100"
      >
        <p class="font-medium">Lighthouse uses your Google account.</p>
        <p class="mt-1 text-sm text-amber-200/90">Connect Google from the Integrations section on the site page to enable Lighthouse.</p>
        <NuxtLink :to="`/sites/${site.id}`" class="mt-4 inline-block text-sm font-semibold text-[#facc15] underline-offset-2 hover:underline">
          Go to {{ site.name }} →
        </NuxtLink>
      </div>

      <template v-else>
        <!-- Mobile / Desktop tabs -->
        <div class="mb-6 flex gap-2 border-b border-slate-700/70">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium transition"
            :class="currentStrategy === 'mobile' ? 'border-b-2 border-[#3b82f6] text-[#3b82f6]' : 'text-slate-400 hover:text-slate-200'"
            @click="currentStrategy = 'mobile'"
          >
            Mobile
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium transition"
            :class="currentStrategy === 'desktop' ? 'border-b-2 border-[#3b82f6] text-[#3b82f6]' : 'text-slate-400 hover:text-slate-200'"
            @click="currentStrategy = 'desktop'"
          >
            Desktop
          </button>
        </div>

        <!-- Run / refresh -->
        <div class="mb-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="rounded-xl bg-gradient-to-r from-[#22c55e] to-[#3b82f6] px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50"
            :disabled="running"
            @click="runReport"
          >
            {{ running ? 'Running…' : report ? 'Run again' : 'Run Lighthouse' }}
          </button>
          <p v-if="report" class="text-sm text-slate-400">
            Last run: {{ formatDate(report.fetchTime) }}
          </p>
          <p v-if="runError" class="text-sm text-rose-400">{{ runError }}</p>
        </div>

        <template v-if="report && categoriesList.length">
          <!-- Four gauges at top – click scrolls to section -->
          <section class="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <button
              v-for="cat in categoriesList"
              :key="cat.id"
              type="button"
              class="flex flex-col items-center rounded-2xl border-2 p-5 shadow-lg shadow-black/20 transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 focus:ring-offset-2 focus:ring-offset-[#0f172a]"
              :class="gaugeBorderClass(cat.score)"
              :aria-label="`${cat.title}: ${scoreLabel(cat.score)}. Click to see what to fix.`"
              @click="scrollToSection(cat.id)"
            >
              <div
                class="text-4xl font-bold tabular-nums"
                :class="gaugeTextClass(cat.score)"
              >
                {{ Math.round(cat.score * 100) }}
              </div>
              <div class="mt-1 text-center text-sm font-semibold text-slate-200">{{ cat.title }}</div>
            </button>
          </section>

          <!-- Detail sections: what to fix -->
          <section
            v-for="cat in categoriesList"
            :key="`detail-${cat.id}`"
            :id="`section-${cat.id}`"
            class="mb-10 scroll-mt-8 rounded-2xl border border-slate-700/70 bg-slate-900/50 p-6 shadow-xl ring-1 ring-white/[0.04]"
          >
            <h2 class="mb-4 text-lg font-semibold text-white">{{ cat.title }}</h2>
            <p v-if="cat.description" class="mb-4 text-sm leading-relaxed text-slate-400">{{ cat.description }}</p>
            <ul class="space-y-4">
              <li
                v-for="audit in getAuditsToFix(cat)"
                :key="audit.id"
                class="rounded-xl border border-slate-700/60 bg-slate-950/60 p-4"
              >
                <h3 class="font-medium text-slate-100">{{ audit.title }}</h3>
                <div
                  v-if="audit.description"
                  class="lh-audit-desc mt-2 text-sm leading-relaxed text-slate-400"
                  v-html="audit.description"
                />
                <p v-if="audit.displayValue" class="mt-2 text-sm font-semibold tabular-nums text-slate-200">{{ audit.displayValue }}</p>
              </li>
            </ul>
            <p v-if="getAuditsToFix(cat).length === 0" class="text-sm font-medium text-[#22c55e]">
              No issues found for this category.
            </p>
          </section>
        </template>

        <div v-else-if="!report && !running" class="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-12 text-center">
          <p class="text-slate-400">No Lighthouse report yet. Click <strong class="text-slate-200">Run Lighthouse</strong> above.</p>
        </div>
      </template>
    </template>

    <div v-else class="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-12 text-center">
      <p class="text-slate-400">Site not found.</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block font-semibold text-[#3b82f6] hover:underline">Back to Dashboard</NuxtLink>
    </div>
  </SiteIntegrationShell>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import type { GoogleStatusResponse } from '~/composables/useGoogleIntegration'
import { getSite } from '~/services/sites'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)

const pb = usePocketbase()
const { getStatus, getLighthouseReport, runLighthouse } = useGoogleIntegration()
const site = ref<SiteRecord | null>(null)
const googleStatus = ref<GoogleStatusResponse | null>(null)
const pending = ref(true)
const report = ref<LighthouseReportPayload | null>(null)
const running = ref(false)
const runError = ref('')
const currentStrategy = ref<'mobile' | 'desktop'>('mobile')

const lighthouseConnected = computed(
  () => googleStatus.value?.providers?.lighthouse?.status === 'connected'
)

interface LighthouseReportPayload {
  requestedUrl: string
  finalUrl: string
  fetchTime: string
  strategy: string
  categories: Record<string, { id: string; title: string; description?: string; score: number; auditRefs: Array<{ id: string; weight: number }> }>
  audits: Record<string, { id: string; title: string; description?: string; score: number | null; displayValue?: string }>
}

const CATEGORY_IDS = ['performance', 'accessibility', 'best-practices', 'seo'] as const

const categoriesList = computed(() => {
  if (!report.value?.categories) return []
  return CATEGORY_IDS.map((id) => report.value!.categories[id]).filter(Boolean)
})

function scoreLabel(score: number): string {
  if (score >= 0.9) return 'Good'
  if (score >= 0.5) return 'Needs improvement'
  return 'Poor'
}

function gaugeBorderClass(score: number): string {
  if (score >= 0.9) return 'border-[#22c55e]/60 bg-[#22c55e]/10'
  if (score >= 0.5) return 'border-amber-400/60 bg-amber-500/10'
  return 'border-rose-400/60 bg-rose-500/10'
}

function gaugeTextClass(score: number): string {
  if (score >= 0.9) return 'text-[#4ade80]'
  if (score >= 0.5) return 'text-amber-300'
  return 'text-rose-400'
}

// Only audits that failed (numeric score < 1). Excludes passing (score === 1) and informational (score === null).
function getAuditsToFix(cat: { auditRefs: Array<{ id: string }> }): Array<{ id: string; title: string; description?: string; displayValue?: string }> {
  if (!report.value?.audits) return []
  const list: Array<{ id: string; title: string; description?: string; displayValue?: string }> = []
  for (const ref of cat.auditRefs) {
    const audit = report.value.audits[ref.id]
    if (!audit) continue
    const score = audit.score
    if (typeof score === 'number' && score < 1) list.push(audit)
  }
  return list
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function scrollToSection(categoryId: string): void {
  const el = document.getElementById(`section-${categoryId}`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function loadSite() {
  const s = await getSite(pb, siteId.value)
  site.value = s
}

async function loadGoogleStatus() {
  if (!site.value) return
  try {
    googleStatus.value = await getStatus(site.value.id)
  } catch {
    googleStatus.value = null
  }
}

async function loadReport() {
  if (!site.value) return
  try {
    const data = await getLighthouseReport(site.value.id, currentStrategy.value)
    report.value = data as LighthouseReportPayload | null
  } catch {
    report.value = null
  }
}

async function runReport() {
  if (!site.value) return
  running.value = true
  runError.value = ''
  try {
    const data = await runLighthouse(site.value.id, currentStrategy.value) as LighthouseReportPayload & { error?: string }
    if (data.error) {
      runError.value = data.error
      return
    }
    report.value = data
  } catch (e) {
    runError.value = e instanceof Error ? e.message : 'Run failed'
  } finally {
    running.value = false
  }
}

async function init() {
  pending.value = true
  try {
    await loadSite()
    await loadGoogleStatus()
    await loadReport()
  } finally {
    pending.value = false
  }
}

watch(currentStrategy, () => {
  loadReport()
})

onMounted(() => init())
watch(siteId, () => init())
</script>

<style scoped>
/* Lighthouse audit HTML often ships with dark inline colors — force readable text on dark cards */
.lh-audit-desc :deep(p),
.lh-audit-desc :deep(li),
.lh-audit-desc :deep(span),
.lh-audit-desc :deep(div) {
  color: #94a3b8 !important;
}

.lh-audit-desc :deep(a) {
  color: #60a5fa !important;
  text-decoration: underline;
}

.lh-audit-desc :deep(strong),
.lh-audit-desc :deep(b) {
  color: #e2e8f0 !important;
  font-weight: 600;
}

.lh-audit-desc :deep(code) {
  border-radius: 0.25rem;
  background: rgba(51, 65, 85, 0.6);
  padding: 0.125rem 0.375rem;
  color: #cbd5e1 !important;
  font-size: 0.8125rem;
}
</style>
