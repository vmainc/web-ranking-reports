<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-white">Website audit form</h1>
      <p class="mt-1 text-sm text-slate-400">
        Embed a client-branded audit form on your WordPress (Breakdance) site. Submissions create CRM leads, run the audit, and email the prospect their report.
      </p>
    </div>

    <CrmSubNav />

    <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-surface-900">Embed & branding</h2>
          <p class="mt-1 text-sm text-surface-600">
            Customize report and embed appearance below, or set defaults under
            <NuxtLink to="/agency" class="font-medium text-primary-600 hover:underline">Agency → branding</NuxtLink>.
            Custom logos require a white-label plan (Agency logo or HTTPS URL below).
          </p>
        </div>
        <label class="flex items-center gap-2 text-sm font-medium text-surface-700">
          <input v-model="settings.enabled" type="checkbox" class="rounded border-surface-300" @change="() => saveSettings()" />
          Form enabled
        </label>
      </div>

      <div v-if="settingsPending" class="text-sm text-surface-500">Loading settings…</div>
      <div v-else class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-surface-700">Headline</label>
            <input v-model="settings.headline" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Button label</label>
            <input v-model="settings.buttonLabel" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-surface-700">Supporting text</label>
            <input v-model="settings.subheadline" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-surface-700">Success message</label>
            <input v-model="settings.successMessage" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
            <p class="mt-1 text-xs text-surface-500">Shown on the form when no redirect URL is set.</p>
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-surface-700">Thank-you page URL (optional)</label>
            <input
              v-model="settings.redirectUrl"
              type="url"
              placeholder="https://yoursite.com/thank-you"
              class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
            />
            <p class="mt-1 text-xs text-surface-500">
              After a successful submit, the embed and hosted form send visitors here (e.g. your Breakdance thank-you page). The audit still runs and the report link is emailed.
            </p>
          </div>
        </div>

        <div class="rounded-lg border border-surface-200 bg-surface-50 p-4">
          <h3 class="text-sm font-semibold text-surface-900">Report &amp; embed appearance</h3>
          <p class="mt-1 text-xs text-surface-600">
            Colors left blank use Agency defaults
            <template v-if="appearance?.agencyName"> ({{ appearance.agencyName }})</template>.
          </p>
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-surface-700">Brand name on report / form</label>
              <input
                v-model="settings.reportStyle.displayName"
                type="text"
                placeholder="Defaults to Agency name"
                class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Report heading</label>
              <input
                v-model="settings.reportStyle.reportTitle"
                type="text"
                placeholder="Website audit"
                class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
              />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-surface-700">Report footer (optional)</label>
              <input
                v-model="settings.reportStyle.footerText"
                type="text"
                placeholder="© Your agency — questions? hello@example.com"
                class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Primary color</label>
              <div class="mt-1 flex gap-2">
                <input v-model="settings.reportStyle.primary" type="color" class="h-10 w-12 cursor-pointer rounded border border-surface-300" />
                <input
                  v-model="settings.reportStyle.primary"
                  type="text"
                  placeholder="#2563EB"
                  class="min-w-0 flex-1 rounded-lg border border-surface-300 px-3 py-2 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Accent color</label>
              <div class="mt-1 flex gap-2">
                <input v-model="settings.reportStyle.accent" type="color" class="h-10 w-12 cursor-pointer rounded border border-surface-300" />
                <input
                  v-model="settings.reportStyle.accent"
                  type="text"
                  placeholder="#1D4ED8"
                  class="min-w-0 flex-1 rounded-lg border border-surface-300 px-3 py-2 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Text color</label>
              <div class="mt-1 flex gap-2">
                <input v-model="settings.reportStyle.text" type="color" class="h-10 w-12 cursor-pointer rounded border border-surface-300" />
                <input
                  v-model="settings.reportStyle.text"
                  type="text"
                  placeholder="#0F172A"
                  class="min-w-0 flex-1 rounded-lg border border-surface-300 px-3 py-2 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Surface / card color</label>
              <div class="mt-1 flex gap-2">
                <input v-model="settings.reportStyle.surface" type="color" class="h-10 w-12 cursor-pointer rounded border border-surface-300" />
                <input
                  v-model="settings.reportStyle.surface"
                  type="text"
                  placeholder="#FFFFFF"
                  class="min-w-0 flex-1 rounded-lg border border-surface-300 px-3 py-2 font-mono text-sm"
                />
              </div>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-surface-700">Custom logo URL (HTTPS, white-label)</label>
              <input
                v-model="settings.reportStyle.customLogoUrl"
                type="url"
                placeholder="https://yoursite.com/logo.png"
                class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
                :disabled="!appearance?.whiteLabel"
              />
              <p v-if="!appearance?.whiteLabel" class="mt-1 text-xs text-surface-500">
                Upgrade to a white-label plan to replace the Web Ranking Reports logo, or upload a logo on the Agency page.
              </p>
              <p v-else class="mt-1 text-xs text-surface-500">
                Overrides the Agency logo on the embed and report when set. Leave empty to use Agency → logo upload.
              </p>
            </div>
            <label class="flex items-center gap-2 text-sm text-surface-700 sm:col-span-2">
              <input v-model="settings.reportStyle.hideLogo" type="checkbox" class="rounded border-surface-300" />
              Hide logo on embed and report
            </label>
          </div>
        </div>

        <div class="flex flex-wrap gap-4">
          <label class="flex items-center gap-2 text-sm text-surface-700">
            <input v-model="settings.collectPhone" type="checkbox" class="rounded border-surface-300" />
            Collect phone
          </label>
          <label class="flex items-center gap-2 text-sm text-surface-700">
            <input v-model="settings.notifyOwnerEmail" type="checkbox" class="rounded border-surface-300" />
            Email me on new submissions
          </label>
        </div>
        <div v-if="settings.notifyOwnerEmail" class="max-w-md">
          <label class="block text-sm font-medium text-surface-700">Notify email (optional)</label>
          <input
            v-model="settings.ownerNotifyEmail"
            type="email"
            placeholder="Defaults to your account email"
            class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="settingsSaving"
            @click="saveSettings"
          >
            {{ settingsSaving ? 'Saving…' : 'Save settings' }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
            :disabled="settingsSaving"
            @click="rotateKey"
          >
            Rotate embed key
          </button>
          <a
            v-if="embed?.formUrl"
            :href="embed.formUrl"
            target="_blank"
            rel="noopener"
            class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
          >
            Preview form
          </a>
          <span v-if="settingsInfo" class="text-sm text-emerald-700">{{ settingsInfo }}</span>
          <span v-if="settingsError" class="text-sm text-red-600">{{ settingsError }}</span>
        </div>

        <div v-if="embed" class="grid gap-4 lg:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-surface-700">Breakdance / iframe snippet</label>
            <textarea
              :value="embed.iframeSnippet"
              readonly
              rows="4"
              class="mt-1 w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 font-mono text-xs"
            />
            <button type="button" class="mt-2 text-sm font-medium text-primary-600 hover:underline" @click="copyText(embed.iframeSnippet)">
              Copy iframe
            </button>
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Script embed</label>
            <textarea
              :value="embed.scriptSnippet"
              readonly
              rows="4"
              class="mt-1 w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 font-mono text-xs"
            />
            <button type="button" class="mt-2 text-sm font-medium text-primary-600 hover:underline" @click="copyText(embed.scriptSnippet)">
              Copy script
            </button>
          </div>
        </div>
      </div>
    </section>

    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-lg font-semibold text-surface-900">Submissions</h2>
      <button
        type="button"
        class="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm font-medium hover:bg-surface-50"
        :disabled="leadsPending"
        @click="loadLeads"
      >
        {{ leadsPending ? 'Refreshing…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="leadsError" class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{{ leadsError }}</p>

    <CrmDataTable :columns="columns" :rows="leads" :pending="leadsPending">
      <template #cell-received_at="{ value }">
        {{ formatDate(value as string) }}
      </template>
      <template #cell-status="{ value }">
        <span
          class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
          :class="statusClass(String(value))"
        >
          {{ value }}
        </span>
      </template>
      <template #cell-crm="{ row }">
        <NuxtLink
          v-if="(row as LeadRow).crm_client"
          :to="`/crm/clients/${(row as LeadRow).crm_client}`"
          class="font-medium text-primary-600 hover:underline"
        >
          Open contact
        </NuxtLink>
        <span v-else class="text-surface-500">—</span>
      </template>
      <template #actions="{ row }">
        <a
          :href="(row as LeadRow).reportUrl"
          target="_blank"
          rel="noopener"
          class="text-sm font-medium text-primary-600 hover:underline"
        >
          Report
        </a>
      </template>
      <template #empty>No website audit submissions yet.</template>
    </CrmDataTable>
  </div>
</template>

<script setup lang="ts">
type ReportStyle = {
  displayName: string
  reportTitle: string
  footerText: string
  hideLogo: boolean
  customLogoUrl: string
  primary: string
  accent: string
  text: string
  surface: string
}

type Settings = {
  enabled: boolean
  publicKey: string
  headline: string
  subheadline: string
  buttonLabel: string
  successMessage: string
  redirectUrl: string
  collectPhone: boolean
  notifyOwnerEmail: boolean
  ownerNotifyEmail: string
  reportStyle: ReportStyle
}

type Appearance = {
  whiteLabel: boolean
  agencyName: string
  agencyColors: { primary: string; accent: string; text: string; surface: string }
}

type Embed = {
  formUrl: string
  scriptUrl: string
  iframeSnippet: string
  scriptSnippet: string
}

type LeadRow = {
  id: string
  name?: string | null
  email: string
  phone?: string | null
  website: string
  status: string
  crm_client?: string | null
  received_at: string
  email_sent_at?: string | null
  reportUrl: string
}

const pb = usePocketbase()
const settingsPending = ref(true)
const settingsSaving = ref(false)
const settingsError = ref('')
const settingsInfo = ref('')
const defaultReportStyle = (): ReportStyle => ({
  displayName: '',
  reportTitle: 'Website audit',
  footerText: '',
  hideLogo: false,
  customLogoUrl: '',
  primary: '',
  accent: '',
  text: '',
  surface: '',
})

const settings = ref<Settings>({
  enabled: true,
  publicKey: '',
  headline: 'Free website audit',
  subheadline: '',
  buttonLabel: 'Get my free audit',
  successMessage: 'Thanks! We’re generating your report and will email it shortly.',
  redirectUrl: '',
  collectPhone: true,
  notifyOwnerEmail: true,
  ownerNotifyEmail: '',
  reportStyle: defaultReportStyle(),
})
const appearance = ref<Appearance | null>(null)
const embed = ref<Embed | null>(null)
const leads = ref<LeadRow[]>([])
const leadsPending = ref(true)
const leadsError = ref('')

const columns = [
  { key: 'received_at', label: 'Received' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
  { key: 'status', label: 'Status' },
  { key: 'crm', label: 'CRM' },
]

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function statusClass(status: string) {
  if (status === 'ready') return 'bg-emerald-100 text-emerald-800'
  if (status === 'processing' || status === 'received') return 'bg-amber-100 text-amber-800'
  if (status === 'error') return 'bg-rose-100 text-rose-800'
  return 'bg-surface-100 text-surface-700'
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    settingsInfo.value = 'Copied to clipboard'
    setTimeout(() => {
      settingsInfo.value = ''
    }, 2000)
  } catch {
    settingsError.value = 'Could not copy'
  }
}

async function loadSettings() {
  settingsPending.value = true
  settingsError.value = ''
  try {
    const data = await $fetch<{ settings: Settings; embed: Embed; appearance?: Appearance }>(
      '/api/crm/website-audit/settings',
      {
        headers: authHeaders(),
      },
    )
    settings.value = {
      ...settings.value,
      ...data.settings,
      reportStyle: { ...defaultReportStyle(), ...data.settings.reportStyle },
    }
    appearance.value = data.appearance || null
    embed.value = data.embed
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    settingsError.value = err?.data?.message || err?.message || 'Failed to load settings'
  } finally {
    settingsPending.value = false
  }
}

async function saveSettings(opts?: { rotateKey?: boolean }) {
  settingsSaving.value = true
  settingsError.value = ''
  settingsInfo.value = ''
  try {
    const data = await $fetch<{ settings: Settings; embed: Embed; appearance?: Appearance }>(
      '/api/crm/website-audit/settings',
      {
        method: 'PUT',
        headers: authHeaders(),
        body: { ...settings.value, rotateKey: !!opts?.rotateKey },
      },
    )
    settings.value = {
      ...settings.value,
      ...data.settings,
      reportStyle: { ...defaultReportStyle(), ...data.settings.reportStyle },
    }
    appearance.value = data.appearance || appearance.value
    embed.value = data.embed
    settingsInfo.value = opts?.rotateKey ? 'Embed key rotated' : 'Settings saved'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    settingsError.value = err?.data?.message || err?.message || 'Failed to save'
  } finally {
    settingsSaving.value = false
  }
}

async function rotateKey() {
  if (!confirm('Rotate the embed key? Existing embeds will stop working until you update the snippet.')) return
  await saveSettings({ rotateKey: true })
}

async function loadLeads() {
  leadsPending.value = true
  leadsError.value = ''
  try {
    const data = await $fetch<{ leads: LeadRow[] }>('/api/crm/website-audit/leads', { headers: authHeaders() })
    leads.value = data.leads || []
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    leadsError.value = err?.data?.message || err?.message || 'Failed to load leads'
    leads.value = []
  } finally {
    leadsPending.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadSettings(), loadLeads()])
})
</script>
