<template>
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
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
        <h1 class="text-2xl font-semibold text-surface-900">Lighthouse</h1>
        <p class="mt-1 text-sm text-surface-500">Performance, accessibility, best practices, and SEO scores.</p>
      </div>

      <!-- Not connected -->
      <div
        v-if="!lighthouseConnected"
        class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800"
      >
        <p class="font-medium">Lighthouse uses your Google account.</p>
        <p class="mt-1 text-sm">Connect Google from the Integrations section on the site page to enable Lighthouse.</p>
        <NuxtLink :to="`/sites/${site.id}`" class="mt-4 inline-block text-sm font-medium underline">
          Go to {{ site.name }} →
        </NuxtLink>
      </div>

      <template v-else>
        <!-- Mobile / Desktop tabs -->
        <div class="mb-6 flex gap-2 border-b border-surface-200">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium transition"
            :class="currentStrategy === 'mobile' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-surface-500 hover:text-surface-700'"
            @click="currentStrategy = 'mobile'"
          >
            Mobile
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium transition"
            :class="currentStrategy === 'desktop' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-surface-500 hover:text-surface-700'"
            @click="currentStrategy = 'desktop'"
          >
            Desktop
          </button>
        </div>

        <!-- Run / refresh -->
        <div class="mb-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="running"
            @click="runReport"
          >
            {{ running ? 'Running…' : report ? 'Run again' : 'Run Lighthouse' }}
          </button>
          <p v-if="report" class="text-sm text-surface-500">
            Last run: {{ formatDate(report.fetchTime) }}
          </p>
          <p v-if="runError" class="text-sm text-red-600">{{ runError }}</p>
        </div>

        <template v-if="report && categoriesList.length">
          <!-- Four gauges at top – click scrolls to section -->
          <section class="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <button
              v-for="cat in categoriesList"
              :key="cat.id"
              type="button"
              class="flex flex-col items-center rounded-xl border-2 p-5 transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
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
              <div class="mt-1 text-center text-sm font-medium text-surface-700">{{ cat.title }}</div>
            </button>
          </section>

          <!-- Detail sections: what to fix -->
          <section
            v-for="cat in categoriesList"
            :key="`detail-${cat.id}`"
            :id="`section-${cat.id}`"
            class="mb-10 scroll-mt-8 rounded-xl border border-surface-200 bg-white p-6"
          >
            <h2 class="mb-4 text-lg font-semibold text-surface-900">{{ cat.title }}</h2>
            <p v-if="cat.description" class="mb-4 text-sm text-surface-500">{{ cat.description }}</p>
            <ul class="space-y-4">
              <li
                v-for="audit in getAuditsToFix(cat)"
                :key="audit.id"
                class="rounded-lg border border-surface-100 bg-surface-50/50 p-4"
              >
                <h3 class="font-medium text-surface-900">{{ audit.title }}</h3>
                <p v-if="audit.description" class="mt-1 text-sm text-surface-600" v-html="audit.description" />
                <p v-if="audit.displayValue" class="mt-1 text-sm font-medium text-surface-700">{{ audit.displayValue }}</p>
              </li>
            </ul>
            <p v-if="getAuditsToFix(cat).length === 0" class="text-sm text-green-600">
              No issues found for this category.
            </p>
          </section>
        </template>

        <div v-else-if="!report && !running" class="rounded-xl border border-surface-200 bg-white p-12 text-center">
          <p class="text-surface-500">No Lighthouse report yet. Click <strong>Run Lighthouse</strong> above.</p>
        </div>
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
  if (score >= 0.9) return 'border-green-400 bg-green-50/50'
  if (score >= 0.5) return 'border-amber-400 bg-amber-50/50'
  return 'border-red-400 bg-red-50/50'
}

function gaugeTextClass(score: number): string {
  if (score >= 0.9) return 'text-green-700'
  if (score >= 0.5) return 'text-amber-700'
  return 'text-red-700'
}

function getAuditsToFix(cat: { auditRefs: Array<{ id: string }> }): Array<{ id: string; title: string; description?: string; displayValue?: string }> {
  if (!report.value?.audits) return []
  const list: Array<{ id: string; title: string; description?: string; displayValue?: string }> = []
  for (const ref of cat.auditRefs) {
    const audit = report.value.audits[ref.id]
    if (!audit) continue
    const score = audit.score
    if (score === null || score < 1) list.push(audit)
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
