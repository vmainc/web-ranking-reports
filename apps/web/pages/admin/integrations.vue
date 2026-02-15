<template>
  <div class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
    <NuxtLink
      to="/dashboard"
      class="mb-6 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
    >
      ← Dashboard
    </NuxtLink>
    <h1 class="mb-2 text-2xl font-semibold text-surface-900">Admin – Integrations</h1>
    <p class="mb-8 text-sm text-surface-500">
      Configure API keys and OAuth for site integrations. Only admins (e.g. admin@vma.agency) can edit.
    </p>

    <div v-if="!allowed" class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
      <p>You don’t have access to this page.</p>
      <p v-if="hint" class="mt-2 text-sm">{{ hint }}</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-sm font-medium underline">Back to Dashboard</NuxtLink>
    </div>

    <template v-else>
    <!-- Domain lookup (whois + DNS) – above integrations -->
    <section class="mb-8 rounded-2xl border border-surface-200 bg-gradient-to-br from-surface-50 to-white p-6 shadow-sm">
      <h2 class="mb-1 text-lg font-semibold text-surface-900">Domain lookup</h2>
      <p class="mb-4 text-sm text-surface-500">Quick whois and DNS info. Requires Whois API key configured below.</p>
      <form class="mb-4 flex flex-wrap gap-3" @submit.prevent="lookupDomain">
        <input
          v-model="domainInput"
          type="text"
          placeholder="example.com"
          class="min-w-[200px] flex-1 rounded-lg border border-surface-200 bg-white px-3 py-2.5 text-surface-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
        <button
          type="submit"
          :disabled="domainLoading"
          class="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:opacity-50"
        >
          {{ domainLoading ? 'Looking up…' : 'Look up' }}
        </button>
      </form>
      <p v-if="domainError" class="mb-4 text-sm text-red-600">{{ domainError }}</p>

      <template v-if="domainData">
        <div class="mb-4 flex border-b border-surface-200">
          <button
            type="button"
            class="border-b-2 px-4 py-2 text-sm font-medium transition"
            :class="domainTab === 'overview' ? 'border-primary-600 text-primary-600' : 'border-transparent text-surface-500 hover:text-surface-700'"
            @click="domainTab = 'overview'"
          >
            Overview
          </button>
          <button
            type="button"
            class="border-b-2 px-4 py-2 text-sm font-medium transition"
            :class="domainTab === 'dns' ? 'border-primary-600 text-primary-600' : 'border-transparent text-surface-500 hover:text-surface-700'"
            @click="domainTab = 'dns'"
          >
            DNS
          </button>
        </div>

        <div v-if="domainTab === 'overview'" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
              <p class="text-xs font-medium uppercase tracking-wide text-surface-400">Domain age</p>
              <p class="mt-1 text-xl font-semibold text-surface-900">
                {{ domainData.whois.domainAgeYears != null ? `${domainData.whois.domainAgeYears.toFixed(1)} years` : '—' }}
              </p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
              <p class="text-xs font-medium uppercase tracking-wide text-surface-400">Expires</p>
              <p class="mt-1 text-lg font-semibold text-surface-900">
                {{ domainData.whois.expiresAt || '—' }}
              </p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
              <p class="text-xs font-medium uppercase tracking-wide text-surface-400">Registrar</p>
              <p class="mt-1 text-lg font-semibold text-surface-900 truncate" :title="domainData.whois.registrar || ''">
                {{ domainData.whois.registrar || '—' }}
              </p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
              <p class="text-xs font-medium uppercase tracking-wide text-surface-400">Registrant / Company</p>
              <p class="mt-1 text-lg font-semibold text-surface-900 truncate" :title="(domainData.whois.registrantOrg || domainData.whois.registrantName || '')">
                {{ domainData.whois.registrantOrg || domainData.whois.registrantName || '—' }}
              </p>
            </div>
          </div>
          <div class="rounded-xl border border-surface-200 bg-white p-4">
            <p class="text-xs font-medium uppercase tracking-wide text-surface-400">Created</p>
            <p class="mt-1 text-surface-700">{{ domainData.whois.createdAt || '—' }}</p>
            <p class="mt-2 text-xs font-medium uppercase tracking-wide text-surface-400">Last updated</p>
            <p class="mt-1 text-surface-700">{{ domainData.whois.updatedAt || '—' }}</p>
            <p v-if="domainData.whois.registrantCountry" class="mt-2 text-xs font-medium uppercase tracking-wide text-surface-400">Registrant country</p>
            <p v-if="domainData.whois.registrantCountry" class="mt-1 text-surface-700">{{ domainData.whois.registrantCountry }}</p>
          </div>
        </div>

        <div v-if="domainTab === 'dns'" class="space-y-4">
          <div class="rounded-xl border border-surface-200 bg-white p-4">
            <p class="text-xs font-medium uppercase tracking-wide text-surface-400 mb-2">Name servers (whois)</p>
            <ul v-if="domainData.whois.nameServers.length" class="list-inside list-disc space-y-1 text-sm text-surface-700">
              <li v-for="ns in domainData.whois.nameServers" :key="ns">{{ ns }}</li>
            </ul>
            <p v-else class="text-sm text-surface-500">—</p>
          </div>
          <div class="rounded-xl border border-surface-200 bg-white p-4">
            <p class="text-xs font-medium uppercase tracking-wide text-surface-400 mb-2">A records</p>
            <ul v-if="domainData.dns.a.length" class="list-inside list-disc space-y-1 text-sm text-surface-700 font-mono">
              <li v-for="ip in domainData.dns.a" :key="ip">{{ ip }}</li>
            </ul>
            <p v-else class="text-sm text-surface-500">—</p>
          </div>
          <div class="rounded-xl border border-surface-200 bg-white p-4">
            <p class="text-xs font-medium uppercase tracking-wide text-surface-400 mb-2">AAAA records</p>
            <ul v-if="domainData.dns.aaaa.length" class="list-inside list-disc space-y-1 text-sm text-surface-700 font-mono">
              <li v-for="ip in domainData.dns.aaaa" :key="ip">{{ ip }}</li>
            </ul>
            <p v-else class="text-sm text-surface-500">—</p>
          </div>
          <div v-if="domainData.dns.soa" class="rounded-xl border border-surface-200 bg-white p-4">
            <p class="text-xs font-medium uppercase tracking-wide text-surface-400 mb-2">SOA (primary NS)</p>
            <p class="text-sm font-mono text-surface-700">{{ domainData.dns.soa }}</p>
          </div>
        </div>
      </template>
    </section>

    <form class="space-y-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm" @submit.prevent="save">
      <div>
        <label for="client_id" class="mb-1 block text-sm font-medium text-surface-700">Client ID</label>
        <input
          id="client_id"
          v-model="form.client_id"
          type="text"
          autocomplete="off"
          class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 shadow-sm ring-1 ring-transparent transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="xxx.apps.googleusercontent.com"
        />
      </div>
      <div>
        <label for="client_secret" class="mb-1 block text-sm font-medium text-surface-700">Client Secret</label>
        <input
          id="client_secret"
          v-model="form.client_secret"
          type="password"
          autocomplete="off"
          class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 shadow-sm ring-1 ring-transparent transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="GOCSPX-..."
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-surface-700">Redirect URI</label>
        <p class="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-600">
          {{ redirectUri }}
        </p>
        <p class="mt-1 text-xs text-surface-500">Set this exact URL in your Google Cloud OAuth client.</p>
      </div>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="success" class="text-sm text-green-600">Settings saved.</p>
      <button
        type="submit"
        :disabled="saving"
        class="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:opacity-50"
      >
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </form>

    <form class="mt-8 space-y-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm" @submit.prevent="savePagespeed">
      <h2 class="text-lg font-semibold text-surface-900">PageSpeed Insights API key (Lighthouse)</h2>
      <p class="text-sm text-surface-500">
        Used when running Lighthouse reports. Get a key from
        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" class="text-primary-600 underline">Google Cloud Console</a>
        and enable the PageSpeed Insights API. Optional but recommended for production (higher quota).
      </p>
      <div>
        <label for="pagespeed_api_key" class="mb-1 block text-sm font-medium text-surface-700">API key</label>
        <input
          id="pagespeed_api_key"
          v-model="pagespeedForm.api_key"
          type="password"
          autocomplete="off"
          class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 shadow-sm ring-1 ring-transparent transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Leave blank to use env PAGESPEED_API_KEY or no key"
        />
      </div>
      <p v-if="pagespeedError" class="text-sm text-red-600">{{ pagespeedError }}</p>
      <p v-if="pagespeedSuccess" class="text-sm text-green-600">PageSpeed API key saved.</p>
      <button
        type="submit"
        :disabled="pagespeedSaving"
        class="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:opacity-50"
      >
        {{ pagespeedSaving ? 'Saving…' : 'Save PageSpeed key' }}
      </button>
    </form>

    <form class="mt-8 space-y-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm" @submit.prevent="saveWhois">
      <h2 class="text-lg font-semibold text-surface-900">APILayer Whois API</h2>
      <p class="text-sm text-surface-500">
        Domain whois lookups (registration, expiry, registrar). Get a key from
        <a href="https://marketplace.apilayer.com/whois-api" target="_blank" rel="noopener" class="text-primary-600 underline">APILayer Whois API</a>
        (free tier: 3,000 requests/month).
      </p>
      <div>
        <label for="whois_api_key" class="mb-1 block text-sm font-medium text-surface-700">API key</label>
        <input
          id="whois_api_key"
          v-model="whoisForm.api_key"
          type="password"
          autocomplete="off"
          class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 shadow-sm ring-1 ring-transparent transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Your APILayer API key"
        />
      </div>
      <p v-if="whoisError" class="text-sm text-red-600">{{ whoisError }}</p>
      <p v-if="whoisSuccess" class="text-sm text-green-600">Whois API key saved.</p>
      <button
        type="submit"
        :disabled="whoisSaving"
        class="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:opacity-50"
      >
        {{ whoisSaving ? 'Saving…' : 'Save Whois key' }}
      </button>
    </form>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const pb = usePocketbase()
const form = ref({ client_id: '', client_secret: '' })
const pagespeedForm = ref({ api_key: '' })
const whoisForm = ref({ api_key: '' })
const allowed = ref(false)
const hint = ref('')
const saving = ref(false)
const error = ref('')
const success = ref(false)
const pagespeedSaving = ref(false)
const pagespeedError = ref('')
const pagespeedSuccess = ref(false)
const whoisSaving = ref(false)
const whoisError = ref('')
const whoisSuccess = ref(false)

const domainInput = ref('')
const domainLoading = ref(false)
const domainError = ref('')
const domainData = ref<{
  whois: {
    domain: string
    createdAt: string | null
    updatedAt: string | null
    expiresAt: string | null
    domainAgeYears: number | null
    registrar: string | null
    registrantOrg: string | null
    registrantName: string | null
    registrantCountry: string | null
    nameServers: string[]
  }
  dns: { a: string[]; aaaa: string[]; soa?: string }
} | null>(null)
const domainTab = ref<'overview' | 'dns'>('overview')

const redirectUri = computed(() => {
  const config = useRuntimeConfig()
  const appUrl = (config.public.appUrl as string) || (typeof window !== 'undefined' ? window.location.origin : '')
  const base = appUrl.replace(/\/+$/, '') || 'https://webrankingreports.com'
  return `${base}/api/google/callback`
})

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

onMounted(async () => {
  try {
    const res = await $fetch<{ allowed: boolean; hint?: string }>('/api/admin/check', { headers: authHeaders() })
    allowed.value = res.allowed
    hint.value = res.hint ?? ''
    if (res.allowed) {
      const [oauth, pagespeed, whois] = await Promise.all([
        $fetch<{ client_id: string; client_secret: string }>('/api/admin/settings/google-oauth', { headers: authHeaders() }).catch(() => ({ client_id: '', client_secret: '' })),
        $fetch<{ api_key: string }>('/api/admin/settings/pagespeed-api-key', { headers: authHeaders() }).catch(() => ({ api_key: '' })),
        $fetch<{ api_key: string }>('/api/admin/settings/whois-api-key', { headers: authHeaders() }).catch(() => ({ api_key: '' })),
      ])
      form.value = { client_id: oauth.client_id ?? '', client_secret: oauth.client_secret ?? '' }
      pagespeedForm.value = { api_key: pagespeed.api_key ?? '' }
      whoisForm.value = { api_key: whois.api_key ?? '' }
    }
  } catch {
    allowed.value = false
    hint.value = 'Not logged in or session expired. Log in to the app and try again.'
  }
})

async function save() {
  error.value = ''
  success.value = false
  saving.value = true
  try {
    await $fetch('/api/admin/settings/google-oauth', {
      method: 'POST',
      body: {
        client_id: form.value.client_id,
        client_secret: form.value.client_secret,
      },
      headers: authHeaders(),
    })
    success.value = true
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Failed to save'
  } finally {
    saving.value = false
  }
}

async function savePagespeed() {
  pagespeedError.value = ''
  pagespeedSuccess.value = false
  pagespeedSaving.value = true
  try {
    await $fetch('/api/admin/settings/pagespeed-api-key', {
      method: 'POST',
      body: { api_key: pagespeedForm.value.api_key },
      headers: authHeaders(),
    })
    pagespeedSuccess.value = true
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    pagespeedError.value = err?.data?.message ?? err?.message ?? 'Failed to save'
  } finally {
    pagespeedSaving.value = false
  }
}

async function lookupDomain() {
  const domain = domainInput.value.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
  if (!domain) {
    domainError.value = 'Enter a domain (e.g. example.com)'
    return
  }
  domainError.value = ''
  domainData.value = null
  domainLoading.value = true
  try {
    domainData.value = await $fetch<typeof domainData.value>('/api/admin/domain-info', {
      query: { domain },
      headers: authHeaders(),
    })
    domainTab.value = 'overview'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    domainError.value = err?.data?.message ?? err?.message ?? 'Lookup failed'
  } finally {
    domainLoading.value = false
  }
}

async function saveWhois() {
  whoisError.value = ''
  whoisSuccess.value = false
  whoisSaving.value = true
  try {
    await $fetch('/api/admin/settings/whois-api-key', {
      method: 'POST',
      body: { api_key: whoisForm.value.api_key },
      headers: authHeaders(),
    })
    whoisSuccess.value = true
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    whoisError.value = err?.data?.message ?? err?.message ?? 'Failed to save'
  } finally {
    whoisSaving.value = false
  }
}
</script>
