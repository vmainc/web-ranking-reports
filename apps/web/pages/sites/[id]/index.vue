<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div v-if="pending" class="flex justify-center py-12">
      <p class="text-surface-500">Loading…</p>
    </div>

    <template v-else-if="site">
      <div class="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <NuxtLink
            to="/dashboard"
            class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
          >
            ← Dashboard
          </NuxtLink>
          <h1 class="text-2xl font-semibold text-surface-900">{{ site.name }}</h1>
          <p class="mt-1 text-sm text-surface-500">{{ site.domain }}</p>
        </div>
        <NuxtLink
          :to="`/sites/${site.id}/settings`"
          class="rounded p-2 text-surface-400 hover:bg-surface-100 hover:text-surface-600"
          title="Site settings"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </NuxtLink>
      </div>

      <!-- Domain (whois) – cached, refresh button to update -->
      <section class="mb-10 rounded-2xl border border-surface-200 bg-gradient-to-br from-surface-50 to-white p-6 shadow-sm">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-surface-900">Domain</h2>
            <p class="mt-0.5 text-sm text-surface-500">{{ site.domain }}</p>
          </div>
          <button
            v-if="domainData || domainError"
            type="button"
            class="rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-sm font-medium text-surface-600 hover:bg-surface-50 disabled:opacity-50"
            :disabled="domainLoading"
            :title="'Refresh whois data'"
            @click="loadDomainInfo(true)"
          >
            {{ domainLoading ? 'Updating…' : 'Refresh' }}
          </button>
        </div>
        <p v-if="domainError && !domainData" class="text-sm text-amber-700">{{ domainError }}</p>
        <p v-else-if="!domainData && !domainLoading" class="text-sm text-surface-500">Loading domain info…</p>
        <p v-else-if="domainLoading && !domainData" class="text-sm text-surface-500">Loading…</p>
        <div v-else-if="domainData" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
            <p class="text-xs font-medium uppercase tracking-wide text-surface-400">Domain age</p>
            <p class="mt-1 text-xl font-semibold text-surface-900">
              {{ domainData.whois.domainAgeYears != null ? `${domainData.whois.domainAgeYears.toFixed(1)} years` : '—' }}
            </p>
          </div>
          <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
            <p class="text-xs font-medium uppercase tracking-wide text-surface-400">Expires</p>
            <p class="mt-1 text-sm font-semibold text-surface-900 truncate" :title="domainData.whois.expiresAt || ''">
              {{ formatWhoisDate(domainData.whois.expiresAt) }}
            </p>
          </div>
          <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
            <p class="text-xs font-medium uppercase tracking-wide text-surface-400">Registrar</p>
            <p class="mt-1 text-sm font-semibold text-surface-900 truncate" :title="domainData.whois.registrar || ''">
              {{ domainData.whois.registrar || '—' }}
            </p>
          </div>
          <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm flex flex-col justify-center">
            <button
              type="button"
              class="mt-1 rounded-lg border border-primary-600 bg-white px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 transition"
              @click="showDnsModal = true"
            >
              See DNS
            </button>
          </div>
        </div>

        <!-- DNS info modal -->
        <Teleport to="body">
          <div
            v-if="showDnsModal && domainData"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            @click.self="showDnsModal = false"
          >
            <div
              class="w-full max-w-lg rounded-2xl border border-surface-200 bg-white shadow-xl max-h-[85vh] overflow-hidden flex flex-col"
              role="dialog"
              aria-labelledby="dns-modal-title"
            >
              <div class="flex items-center justify-between border-b border-surface-200 px-4 py-3">
                <h3 id="dns-modal-title" class="text-lg font-semibold text-surface-900">DNS & name servers</h3>
                <button
                  type="button"
                  class="rounded p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-600"
                  aria-label="Close"
                  @click="showDnsModal = false"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div class="overflow-y-auto p-4 space-y-4">
                <div v-if="domainData.whois.nameServers?.length" class="rounded-xl border border-surface-200 bg-surface-50 p-4">
                  <p class="text-xs font-medium uppercase tracking-wide text-surface-500 mb-2">Name servers</p>
                  <ul class="list-inside list-disc space-y-1 text-sm font-mono text-surface-800">
                    <li v-for="ns in domainData.whois.nameServers" :key="ns">{{ ns }}</li>
                  </ul>
                </div>
                <div v-else class="rounded-xl border border-surface-200 bg-surface-50 p-4">
                  <p class="text-xs font-medium uppercase tracking-wide text-surface-500 mb-2">Name servers</p>
                  <p class="text-sm text-surface-500">No name servers in whois data.</p>
                </div>
                <div v-if="domainData.dns?.a?.length" class="rounded-xl border border-surface-200 bg-surface-50 p-4">
                  <p class="text-xs font-medium uppercase tracking-wide text-surface-500 mb-2">A records (IPv4)</p>
                  <ul class="list-inside list-disc space-y-1 text-sm font-mono text-surface-800">
                    <li v-for="ip in domainData.dns.a" :key="ip">{{ ip }}</li>
                  </ul>
                </div>
                <div v-if="domainData.dns?.aaaa?.length" class="rounded-xl border border-surface-200 bg-surface-50 p-4">
                  <p class="text-xs font-medium uppercase tracking-wide text-surface-500 mb-2">AAAA records (IPv6)</p>
                  <ul class="list-inside list-disc space-y-1 text-sm font-mono text-surface-800 break-all">
                    <li v-for="ip in domainData.dns.aaaa" :key="ip">{{ ip }}</li>
                  </ul>
                </div>
                <div v-if="domainData.dns?.soa" class="rounded-xl border border-surface-200 bg-surface-50 p-4">
                  <p class="text-xs font-medium uppercase tracking-wide text-surface-500 mb-2">SOA (primary NS)</p>
                  <p class="text-sm font-mono text-surface-800">{{ domainData.dns.soa }}</p>
                </div>
              </div>
            </div>
          </div>
        </Teleport>
        <p v-if="domainData?.fetchedAt" class="mt-3 text-xs text-surface-400">Last updated {{ domainData.fetchedAt }}</p>
      </section>

      <section class="mb-10">
        <div
          v-if="googleConnectedToast"
          class="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800"
        >
          Google connected successfully. Use <strong>View</strong> on Google Analytics to choose a property and see reports.
        </div>
        <h2 class="mb-4 text-lg font-medium text-surface-900">Integrations</h2>
        <p class="mb-6 text-sm text-surface-500">
          Connect data sources for this site. When connected, click <strong>View</strong> to open the analytics dashboard and reports.
        </p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SiteIntegrationCard
            v-for="provider in providerList"
            :key="provider"
            :site-id="site.id"
            :provider="provider"
            :integration="integrationByProvider(provider)"
            :google-status="googleStatus"
            :other-connected-site="provider === 'google_analytics' ? otherConnectedSite : null"
            @updated="refreshIntegrations"
          />
          <div
            class="flex flex-col rounded-xl border border-surface-200 bg-white p-5 shadow-card transition hover:shadow-card-hover"
          >
            <div class="flex min-w-0 flex-1 items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-500">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div class="min-w-0">
                <h3 class="font-medium text-surface-900">Rank tracking</h3>
                <p class="mt-0.5 text-sm text-surface-500">Track keyword rankings (DataForSEO)</p>
              </div>
            </div>
            <div class="mt-4">
              <NuxtLink
                :to="`/sites/${site.id}/rank-tracking`"
                class="flex items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
              >
                View
              </NuxtLink>
            </div>
          </div>
        </div>
      </section>
    </template>

    <div v-else class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-500">Site not found.</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-primary-600 hover:underline">Back to Dashboard</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord, IntegrationRecord, IntegrationProvider } from '~/types'
import type { GoogleStatusResponse } from '~/composables/useGoogleIntegration'
import { getSite } from '~/services/sites'
import { listIntegrationsBySite, getProviderList } from '~/services/integrations'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'

const route = useRoute()
const siteId = computed(() => route.params.id as string)

const pb = usePocketbase()
const { getStatus, getOtherConnectedSite } = useGoogleIntegration()
const site = ref<SiteRecord | null>(null)
const integrations = ref<IntegrationRecord[]>([])
const googleStatus = ref<GoogleStatusResponse | null>(null)
const googleConnectedToast = ref(false)
const otherConnectedSite = ref<{ otherSiteId: string; otherSiteName: string | null } | null>(null)
const pending = ref(true)

const domainData = ref<{
  whois: {
    domainAgeYears?: number | null
    expiresAt?: string | null
    registrar?: string | null
    registrantOrg?: string | null
    registrantName?: string | null
    nameServers?: string[]
  }
  dns?: { a: string[]; aaaa: string[]; soa?: string }
  fetchedAt: string
} | null>(null)
const domainError = ref('')
const domainLoading = ref(false)
const showDnsModal = ref(false)

const providerList = getProviderList()

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Format whois date (ISO or similar) as US MM/DD/YYYY; time is dropped */
function formatWhoisDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const year = d.getFullYear()
  return `${month}/${day}/${year}`
}

async function loadDomainInfo(forceRefresh = false) {
  if (!site.value) return
  domainLoading.value = true
  domainError.value = ''
  try {
    const q = forceRefresh ? '?refresh=1' : ''
    domainData.value = await $fetch(`/api/sites/${site.value.id}/domain-info${q}`, { headers: authHeaders() }) as typeof domainData.value
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    domainError.value = err?.data?.message ?? err?.message ?? 'Could not load domain info.'
    if (forceRefresh) domainData.value = null
  } finally {
    domainLoading.value = false
  }
}

function integrationByProvider(provider: IntegrationProvider): IntegrationRecord | undefined {
  return integrations.value.find((i) => i.provider === provider)
}

async function loadSite() {
  const s = await getSite(pb, siteId.value)
  site.value = s
}

async function loadIntegrations() {
  if (!site.value) return
  integrations.value = await listIntegrationsBySite(pb, site.value.id)
}

async function loadGoogleStatus() {
  if (!site.value) return
  try {
    googleStatus.value = await getStatus(site.value.id)
  } catch {
    googleStatus.value = null
  }
}

async function loadOtherConnectedSite() {
  if (!site.value || googleStatus.value?.connected) {
    otherConnectedSite.value = null
    return
  }
  try {
    const res = await getOtherConnectedSite(site.value.id)
    if (res.otherSiteId) {
      otherConnectedSite.value = { otherSiteId: res.otherSiteId, otherSiteName: res.otherSiteName }
    } else {
      otherConnectedSite.value = null
    }
  } catch {
    otherConnectedSite.value = null
  }
}

async function refreshIntegrations() {
  await loadIntegrations()
  await loadGoogleStatus()
  await loadOtherConnectedSite()
}

async function init() {
  pending.value = true
  try {
    await loadSite()
    await Promise.all([loadIntegrations(), loadGoogleStatus()])
    loadDomainInfo().catch(() => {}) // non-blocking; shows error in Domain card if whois unavailable
    await loadOtherConnectedSite()
    if (route.query.google === 'connected') {
      googleConnectedToast.value = true
      if (typeof window !== 'undefined') window.history.replaceState({}, '', `/sites/${siteId.value}`)
      setTimeout(() => { googleConnectedToast.value = false }, 5000)
    }
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
watch(() => route.query.google, () => {
  if (route.query.google === 'connected' && site.value) loadGoogleStatus()
})
</script>
