<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
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
        <h1 class="text-2xl font-semibold text-surface-900">Site settings</h1>
        <p class="mt-1 text-sm text-surface-500">{{ site.domain }}</p>
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
            title="Refresh whois data"
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

      <!-- Site technologies (Wappalyzer-style) -->
      <section class="mb-10 rounded-2xl border border-surface-200 bg-gradient-to-br from-surface-50 to-white p-6 shadow-sm">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">Site technologies</h2>
        <p class="mb-4 text-sm text-surface-600">
          Scan the live site to detect WordPress and common integrations (Analytics, Tag Manager, Cloudflare, WooCommerce).
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            :disabled="techDetectionLoading"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            @click="loadTechDetection"
          >
            {{ techDetectionLoading ? 'Scanning…' : 'Scan site' }}
          </button>
          <p v-if="techDetectionError" class="text-sm text-red-600">{{ techDetectionError }}</p>
        </div>
        <div v-if="techDetectionResult" class="mt-4">
          <div class="flex flex-wrap gap-2">
            <span
              v-for="t in techDetectionResult.detected"
              :key="t.id"
              class="inline-flex items-center rounded-full bg-surface-100 px-3 py-1 text-sm font-medium text-surface-800"
            >
              {{ t.name }}
            </span>
          </div>
          <p class="mt-3 text-xs text-surface-400">
            Scanned {{ techDetectionResult.url }} · {{ formatTechDetectionDate(techDetectionResult.fetchedAt) }}
          </p>
        </div>
        <p v-else-if="!techDetectionLoading && !techDetectionError" class="mt-4 text-sm text-surface-500">
          Click “Scan site” to detect technologies on {{ site.domain }}.
        </p>
      </section>

      <!-- What's connected – manage each integration here -->
      <section class="mb-10 rounded-xl border border-surface-200 bg-white p-6 shadow-card">
        <h2 class="mb-4 text-lg font-medium text-surface-900">What's connected</h2>
        <p class="mb-6 text-sm text-surface-500">
          Integrations linked to this site. Connect, view, disconnect or configure each one below.
        </p>
        <div class="overflow-x-auto rounded-lg border border-surface-200">
          <table class="min-w-full divide-y divide-surface-200 text-left text-sm">
            <thead class="bg-surface-50">
              <tr>
                <th class="px-4 py-3 font-medium text-surface-700">Integration</th>
                <th class="px-4 py-3 font-medium text-surface-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-200 bg-white">
              <tr v-for="provider in providerList" :key="provider">
                <td class="whitespace-nowrap px-4 py-3 font-medium text-surface-900">{{ getProviderLabel(provider) }}</td>
                <td class="px-4 py-3 text-right">
                  <SiteIntegrationCard
                    variant="actions"
                    :site-id="site.id"
                    :provider="provider"
                    :integration="integrationByProvider(provider)"
                    :google-status="googleStatus"
                    :other-connected-site="otherConnectedSite"
                    @updated="refreshIntegrations"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Logo -->
      <section class="mb-10 rounded-xl border border-surface-200 bg-white p-6 shadow-card">
        <h2 class="mb-4 text-lg font-medium text-surface-900">Site logo</h2>
        <p class="mb-4 text-sm text-surface-500">
          Optional logo for this site only. Reports use the <strong>agency logo</strong> (set in Admin → Integrations). Max 2MB.
        </p>
        <div class="flex flex-wrap items-start gap-6">
          <div
            v-if="logoBlobUrl"
            class="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-surface-200 bg-surface-50"
          >
            <img :src="logoBlobUrl" alt="Site logo" class="h-full w-full object-contain" />
          </div>
          <div v-else class="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-surface-200 bg-surface-50 text-surface-400">
            <span class="text-xs">No logo</span>
          </div>
          <div class="min-w-0 flex-1">
            <input
              ref="logoInput"
              type="file"
              accept="image/*"
              class="block w-full text-sm text-surface-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
              :disabled="logoUploading"
              @change="onLogoChange"
            />
            <p v-if="logoUploading" class="mt-2 text-sm text-surface-500">Uploading…</p>
            <p v-else-if="logoError" class="mt-2 text-sm text-red-600">{{ logoError }}</p>
            <p v-else-if="logoPreviewError" class="mt-2 text-sm text-amber-600">{{ logoPreviewError }}</p>
            <p v-else-if="logoSuccess" class="mt-2 text-sm text-green-600">Logo updated.</p>
          </div>
        </div>
      </section>

      <!-- Delete site -->
      <section class="rounded-xl border border-red-100 bg-red-50/50 p-6">
        <h2 class="mb-2 text-lg font-medium text-surface-900">Delete site</h2>
        <p class="mb-4 text-sm text-surface-600">
          Remove this site from your dashboard. Integrations and reports for this site will be removed. This cannot be undone.
        </p>
        <div v-if="!confirmDelete" class="flex items-center gap-3">
          <button
            type="button"
            class="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            @click="confirmDelete = true"
          >
            Delete site
          </button>
        </div>
        <div v-else class="flex flex-wrap items-center gap-3">
          <span class="text-sm text-surface-700">Are you sure?</span>
          <button
            type="button"
            class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            :disabled="deleting"
            @click="deleteSiteConfirm"
          >
            {{ deleting ? 'Deleting…' : 'Yes, delete' }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
            :disabled="deleting"
            @click="confirmDelete = false"
          >
            Cancel
          </button>
        </div>
        <p v-if="deleteError" class="mt-3 text-sm text-red-600">{{ deleteError }}</p>
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
import { getSite, deleteSite as deleteSiteService, updateSiteLogo } from '~/services/sites'
import { listIntegrationsBySite, getSiteIntegrationProviderList, getProviderLabel } from '~/services/integrations'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'
const route = useRoute()
const router = useRouter()
const siteId = computed(() => route.params.id as string)

const pb = usePocketbase()
const { getStatus, getOtherConnectedSite } = useGoogleIntegration()
const site = ref<SiteRecord | null>(null)
const integrations = ref<IntegrationRecord[]>([])
const googleStatus = ref<GoogleStatusResponse | null>(null)
const otherConnectedSite = ref<{ otherSiteId: string; otherSiteName: string | null } | null>(null)
// Lighthouse is view-only and has no per-site "configure" flow in this UI.
const providerList = getSiteIntegrationProviderList().filter((p) => p !== 'lighthouse')
const pending = ref(true)
const logoInput = ref<HTMLInputElement | null>(null)
const logoError = ref('')
const logoSuccess = ref(false)
const logoUploading = ref(false)
const confirmDelete = ref(false)
const deleting = ref(false)
const deleteError = ref('')

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

// Tech detection (WordPress, Analytics, GTM, Cloudflare, WooCommerce)
const techDetectionResult = ref<{
  url: string
  fetchedAt: string
  detected: Array<{ id: string; name: string }>
} | null>(null)
const techDetectionLoading = ref(false)
const techDetectionError = ref('')

function formatTechDetectionDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

async function loadTechDetection() {
  if (!site.value) return
  techDetectionLoading.value = true
  techDetectionError.value = ''
  try {
    const data = await $fetch<{ url: string; fetchedAt: string; detected: Array<{ id: string; name: string }> }>(
      `/api/sites/${site.value.id}/tech-detection`,
      { headers: authHeaders() }
    )
    techDetectionResult.value = data
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string }; message?: string })?.data?.message ?? (e as Error)?.message ?? 'Scan failed'
    techDetectionError.value = msg
    techDetectionResult.value = null
  } finally {
    techDetectionLoading.value = false
  }
}

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

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
    const data = await $fetch(`/api/sites/${site.value.id}/domain-info${q}`, { headers: authHeaders() }) as typeof domainData.value | { configured: false; message: string }
    if (data && 'configured' in data && data.configured === false) {
      domainError.value = data.message ?? 'Domain lookup not configured.'
      domainData.value = null
    } else {
      domainData.value = data as typeof domainData.value
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    domainError.value = err?.data?.message ?? err?.message ?? 'Could not load domain info.'
    if (forceRefresh) domainData.value = null
  } finally {
    domainLoading.value = false
  }
}

const logoBlobUrl = ref<string | null>(null)
const logoPreviewError = ref('')

function hasLogo(s: SiteRecord | null): boolean {
  if (!s?.id) return false
  const logo = s.logo
  if (typeof logo === 'string' && logo) return true
  if (Array.isArray(logo) && logo.length > 0) return true
  return false
}

async function loadLogo() {
  logoPreviewError.value = ''
  if (logoBlobUrl.value) {
    URL.revokeObjectURL(logoBlobUrl.value)
    logoBlobUrl.value = null
  }
  const s = site.value
  if (!hasLogo(s)) return
  try {
    const record = s as SiteRecord
    const logo = record.logo
    const filename =
      typeof logo === 'string'
        ? logo
        : Array.isArray(logo) && logo.length > 0
          ? logo[0]
          : null
    if (!filename) return
    // Use PocketBase file URL directly; if the file works in PB admin it should work here.
    logoBlobUrl.value = pb.files.getUrl(record, filename)
  } catch (e: unknown) {
    logoBlobUrl.value = null
    logoPreviewError.value = 'Preview could not be loaded.'
  }
}

function integrationByProvider(provider: IntegrationProvider): IntegrationRecord | undefined {
  return integrations.value.find((i) => i.provider === provider)
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

async function loadSite() {
  site.value = await getSite(pb, siteId.value)
}

async function loadIntegrations() {
  if (!site.value) return
  integrations.value = await listIntegrationsBySite(pb, site.value.id)
}

async function onLogoChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  logoError.value = ''
  logoSuccess.value = false
  if (!file || !site.value) return
  if (file.size > 2 * 1024 * 1024) {
    logoError.value = 'File must be under 2MB.'
    return
  }
  const token = pb.authStore.token
  if (!token) {
    logoError.value = 'Not signed in.'
    return
  }
  logoUploading.value = true
  logoPreviewError.value = ''
  try {
    const updated = await updateSiteLogo(pb, site.value.id, file)
    site.value = updated
    await loadLogo()
    logoSuccess.value = true
    if (logoInput.value) logoInput.value.value = ''
    setTimeout(() => { logoSuccess.value = false }, 3000)
  } catch (err: unknown) {
    const data = err && typeof err === 'object' && 'data' in err ? (err as { data?: { message?: string } }).data : undefined
    const msg = typeof data?.message === 'string'
      ? data.message
      : err instanceof Error
        ? err.message
        : 'Upload failed. Try a small image under 2MB.'
    logoError.value = msg
  } finally {
    logoUploading.value = false
  }
}

async function deleteSiteConfirm() {
  if (!site.value || deleting.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteSiteService(pb, site.value.id)
    await router.push('/dashboard')
  } catch (err: unknown) {
    deleteError.value = err instanceof Error ? err.message : 'Failed to delete site.'
  } finally {
    deleting.value = false
  }
}

async function init() {
  pending.value = true
  try {
    await loadSite()
    await Promise.all([loadIntegrations(), loadGoogleStatus()])
    await loadOtherConnectedSite()
    loadDomainInfo().catch(() => {})
    await loadLogo()
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())

onUnmounted(() => {
  if (logoBlobUrl.value) {
    URL.revokeObjectURL(logoBlobUrl.value)
    logoBlobUrl.value = null
  }
})
</script>
