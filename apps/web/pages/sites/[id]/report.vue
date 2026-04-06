<template>
  <div class="report-page mx-auto max-w-4xl bg-white px-6 py-8 print:px-8 print:py-6" :style="reportStyleVars">
    <div v-if="pending" class="flex justify-center py-12">
      <p class="text-surface-500">Loading report…</p>
    </div>

    <template v-else-if="site">
      <header class="mb-8 border-b border-surface-200 pb-6 print:mb-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div
              v-if="agencyLogoUrl"
              class="mb-3 inline-flex items-center justify-center rounded-xl bg-white/80 px-3 py-2 shadow-sm backdrop-blur print:bg-white"
            >
              <img
                :src="agencyLogoUrl"
                alt="Agency logo"
                class="h-12 w-auto object-contain object-left print:h-10"
              />
            </div>
            <p v-if="agencyName" class="mb-1 text-sm font-semibold text-surface-700">{{ agencyName }}</p>
            <h1 class="text-2xl font-bold text-surface-900">{{ site.name }}</h1>
            <p class="mt-1 text-sm text-surface-500">{{ site.domain }}</p>
            <p class="mt-2 text-sm text-surface-600">
              {{ dateRangeLabel }} · Generated {{ generatedAt }}
            </p>
            <div class="mt-3 flex flex-wrap items-center gap-3 print:hidden">
              <label class="text-sm font-medium text-surface-700">Date range</label>
              <select
                :value="rangePreset"
                class="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900"
                @change="(e) => setRange((e.target as HTMLSelectElement).value)"
              >
                <option value="last_7_days">Last 7 days</option>
                <option value="last_28_days">Last 28 days</option>
                <option value="last_90_days">Last 90 days</option>
              </select>
              <label class="flex items-center gap-2 text-sm text-surface-600">
                <input
                  type="checkbox"
                  :checked="comparePreset !== 'none'"
                  class="rounded"
                  @change="(e) => setCompare((e.target as HTMLInputElement).checked)"
                />
                Compare to previous period
              </label>
            </div>
          </div>
          <div class="flex flex-col items-end gap-2 print:hidden">
            <div class="flex flex-wrap items-center justify-end gap-2">
              <input
                v-model.trim="recipientEmail"
                type="email"
                class="min-w-[11rem] max-w-[16rem] rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900"
                placeholder="Recipient email"
                autocomplete="email"
                :disabled="sendingEmail || !hasGa"
              />
              <button
                type="button"
                class="rounded-lg border border-surface-300 bg-white px-4 py-2 text-sm font-semibold text-surface-800 hover:bg-surface-50 disabled:opacity-50"
                :disabled="sendingEmail || !hasGa"
                :title="!hasGa ? 'Connect Google Analytics to use this report' : 'Email the report as a PDF attachment'"
                @click="sendReportEmail"
              >
                {{ sendingEmail ? 'Sending…' : 'Send now' }}
              </button>
              <button
                type="button"
                class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
                :disabled="exporting"
                @click="exportPdf(rangePreset, comparePreset)"
              >
                {{ exporting ? 'Exporting…' : 'Export PDF' }}
              </button>
            </div>
            <p v-if="sendEmailFeedback" class="max-w-xs text-right text-sm" :class="sendEmailOk ? 'text-emerald-700' : 'text-red-600'">
              {{ sendEmailFeedback }}
            </p>
            <p v-if="exportError" class="text-sm text-red-600">{{ exportError }}</p>
          </div>
        </div>
      </header>

      <section v-if="!hasGa" class="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p>Connect Google Analytics and select a property to generate reports.</p>
      </section>

      <template v-else>
        <section class="report-section mb-8">
          <h2 class="mb-4 text-lg font-semibold text-surface-900">Performance summary</h2>
          <DashboardWidgetKpiSummary
            :site-id="site.id"
            :range="rangePreset"
            :compare="comparePreset"
            :subtitle="''"
            report-mode
            :show-menu="false"
          />
        </section>

        <section class="report-section mb-8">
          <h2 class="mb-4 text-lg font-semibold text-surface-900">Sessions trend</h2>
          <DashboardWidgetSessionsTrend
            :site-id="site.id"
            :range="rangePreset"
            :compare="comparePreset"
            report-mode
            :show-menu="false"
          />
        </section>

        <section class="report-section mb-8">
          <h2 class="mb-4 text-lg font-semibold text-surface-900">Traffic channels</h2>
          <DashboardWidgetChannels
            :site-id="site.id"
            :range="rangePreset"
            report-mode
            :show-menu="false"
          />
        </section>

        <section class="report-section mb-8">
          <h2 class="mb-4 text-lg font-semibold text-surface-900">Top countries</h2>
          <DashboardWidgetCountries
            :site-id="site.id"
            :range="rangePreset"
            :limit="10"
            report-mode
            :show-menu="false"
          />
        </section>

        <section class="report-section mb-8">
          <h2 class="mb-4 text-lg font-semibold text-surface-900">Top pages</h2>
          <DashboardWidgetTopPages
            :site-id="site.id"
            :range="rangePreset"
            :limit="10"
            report-mode
            :show-menu="false"
          />
        </section>

        <section class="report-section mb-8">
          <h2 class="mb-4 text-lg font-semibold text-surface-900">Landing pages</h2>
          <DashboardWidgetLandingPages
            :site-id="site.id"
            :range="rangePreset"
            :limit="10"
            report-mode
            :show-menu="false"
          />
        </section>

        <section class="report-section mb-8">
          <h2 class="mb-4 text-lg font-semibold text-surface-900">Top events</h2>
          <DashboardWidgetEvents
            :site-id="site.id"
            :range="rangePreset"
            :limit="10"
            report-mode
            :show-menu="false"
          />
        </section>

        <section class="report-section mb-8">
          <h2 class="mb-4 text-lg font-semibold text-surface-900">Ecommerce</h2>
          <DashboardWidgetEcommerce
            :site-id="site.id"
            :range="rangePreset"
            report-mode
            :show-menu="false"
          />
        </section>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import { getSite } from '~/services/sites'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()
const site = ref<SiteRecord | null>(null)
const pending = ref(true)
const { getStatus } = useGoogleIntegration()
const googleStatus = ref<Awaited<ReturnType<typeof getStatus>> | null>(null)

const rangePreset = computed(() => (route.query.range as string) || 'last_28_days')
const comparePreset = computed(() => (route.query.compare as string) || 'previous_period')
const agencyLogoUrl = ref<string | null>(null)
const agencyName = ref('')
const brandingColors = ref({
  primary: '#2563EB',
  accent: '#1D4ED8',
  text: '#0F172A',
  surface: '#FFFFFF',
})
const reportStyleVars = computed(() => ({
  '--report-primary': brandingColors.value.primary,
  '--report-accent': brandingColors.value.accent,
  '--report-text': brandingColors.value.text,
  '--report-surface': brandingColors.value.surface,
}))

function setRange(range: string) {
  navigateTo({ path: route.path, query: { ...route.query, range } })
}

function setCompare(enable: boolean) {
  navigateTo({ path: route.path, query: { ...route.query, compare: enable ? 'previous_period' : 'none' } })
}

const hasGa = computed(() => googleStatus.value?.connected && googleStatus.value?.selectedProperty)

const dateRangeLabel = computed(() => {
  const r = rangePreset.value
  const c = comparePreset.value !== 'none' ? ' (vs previous period)' : ''
  if (r === 'last_7_days') return 'Last 7 days' + c
  if (r === 'last_28_days') return 'Last 28 days' + c
  if (r === 'last_90_days') return 'Last 90 days' + c
  return r + c
})

const generatedAt = ref('')
const { exportPdf, exporting, error: exportError } = useExportPdf(siteId)

const sendingEmail = ref(false)
const sendEmailFeedback = ref('')
const sendEmailOk = ref(false)
const recipientEmail = ref('')

function syncRecipientFromAccount() {
  const m = pb.authStore.model as { email?: string } | undefined
  const email = m?.email
  if (typeof email === 'string' && email.includes('@')) recipientEmail.value = email.trim()
}

async function sendReportEmail() {
  if (!site.value || !hasGa.value) return
  sendingEmail.value = true
  sendEmailFeedback.value = ''
  sendEmailOk.value = false
  try {
    const res = await $fetch<{ ok?: boolean; emailSent?: boolean; warning?: string }>(
      `/api/sites/${siteId.value}/report/send-email`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: {
          to: recipientEmail.value || undefined,
          range: rangePreset.value,
          compare: comparePreset.value,
          fullReport: false,
        },
      },
    )
    if (res.emailSent) {
      sendEmailOk.value = true
      sendEmailFeedback.value = 'Check your inbox for the PDF.'
    } else if (res.warning) {
      sendEmailFeedback.value = res.warning
    } else {
      sendEmailFeedback.value = 'Could not send email.'
    }
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'data' in e ? (e as { data?: { message?: string } }).data?.message : undefined
    sendEmailFeedback.value = typeof msg === 'string' ? msg : 'Could not send email.'
  } finally {
    sendingEmail.value = false
  }
}

onMounted(() => {
  generatedAt.value = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  syncRecipientFromAccount()
})

onMounted(() => {
  let done = false
  const check = () => {
    if (done) return
    requestAnimationFrame(() => {
      if (document.readyState === 'complete') {
        setTimeout(() => {
          if (typeof window !== 'undefined') (window as unknown as { __REPORT_READY__?: boolean }).__REPORT_READY__ = true
          done = true
        }, 1500)
      } else check()
    })
  }
  check()
})

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadAgencyLogo() {
  if (agencyLogoUrl.value) {
    URL.revokeObjectURL(agencyLogoUrl.value)
    agencyLogoUrl.value = null
  }
  try {
    const blob = await $fetch<Blob>('/api/agency/logo', { headers: authHeaders(), responseType: 'blob' })
    if (blob?.size) agencyLogoUrl.value = URL.createObjectURL(blob)
  } catch {
    // No agency logo
  }
}

async function loadBrandingColors() {
  try {
    const res = await $fetch<{ name?: string; colors?: Partial<typeof brandingColors.value> }>('/api/agency/branding')
    const colors = res?.colors ?? {}
    agencyName.value = typeof res?.name === 'string' ? res.name : ''
    brandingColors.value = {
      primary: String(colors.primary || brandingColors.value.primary),
      accent: String(colors.accent || brandingColors.value.accent),
      text: String(colors.text || brandingColors.value.text),
      surface: String(colors.surface || brandingColors.value.surface),
    }
  } catch {
    // Use defaults.
  }
}

onBeforeUnmount(() => {
  if (agencyLogoUrl.value) {
    URL.revokeObjectURL(agencyLogoUrl.value)
    agencyLogoUrl.value = null
  }
})

async function init() {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
    if (site.value) {
      loadAgencyLogo()
      loadBrandingColors()
      googleStatus.value = await getStatus(site.value.id).catch(() => null)
    }
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>

<style scoped>
.report-page {
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
  --report-border-color: #ffffff;
  --report-primary: #2563eb;
  --report-accent: #1d4ed8;
  --report-text: #0f172a;
  --report-surface: #ffffff;
}
.report-section {
  break-inside: auto;
  page-break-inside: auto;
}
.report-page :deep(.border-surface-200),
.report-page :deep(.border-surface-300),
.report-page :deep(.border-surface-100) {
  border-color: var(--report-border-color) !important;
}
.report-page :deep(.bg-primary-600) {
  background-color: var(--report-primary) !important;
}
.report-page :deep(.hover\:bg-primary-500:hover) {
  background-color: var(--report-accent) !important;
}
.report-page :deep(.text-primary-600) {
  color: var(--report-primary) !important;
}
.report-page :deep(.border-primary-600) {
  border-color: var(--report-primary) !important;
}
.report-page :deep(.text-surface-900) {
  color: var(--report-text) !important;
}
@media print {
  .report-page { padding: 0; }
}
</style>
