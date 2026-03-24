<template>
  <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
    <div v-if="pending" class="flex justify-center py-12">
      <p class="text-surface-500">Loading…</p>
    </div>

    <template v-else-if="site && allowed">
      <div class="mb-8">
        <NuxtLink
          to="/sites"
          class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
        >
          ← My Sites
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-surface-900">Set up {{ site.name }}</h1>
        <p class="mt-1 text-sm text-surface-500">{{ site.domain }}</p>
        <p class="mt-2 text-sm text-surface-600">
          Complete setup in order: Google, GA4, Search Console, Business Profile, WooCommerce, and Ads. You can skip any step and come back later.
        </p>
      </div>

      <!-- Step indicator -->
      <ol class="mb-10 flex flex-wrap gap-4 border-b border-surface-200 pb-6 text-sm">
        <li
          v-for="(label, i) in stepLabels"
          :key="label"
          class="flex items-center gap-2"
        >
          <button
            type="button"
            class="flex items-center gap-2 rounded-md px-1 py-0.5 transition"
            :class="i === stepIndex ? 'font-semibold text-primary-700' : firstUnconfirmedStep > i ? 'text-primary-700' : 'text-surface-400 hover:text-surface-600'"
            @click="goToStep(i)"
          >
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs"
              :class="firstUnconfirmedStep > i ? 'bg-primary-600 text-white' : i === stepIndex ? 'bg-primary-100 text-primary-800' : 'bg-surface-100 text-surface-500'"
            >
              {{ firstUnconfirmedStep > i ? '✓' : i + 1 }}
            </span>
            {{ label }}
          </button>
        </li>
      </ol>

      <div
        v-if="googleToast === 'connected'"
        class="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
      >
        Google connected. Continue by selecting your GA4 property below.
      </div>
      <div
        v-else-if="googleToast === 'error'"
        class="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      >
        Google sign-in failed. Try again or check Admin → Integrations OAuth settings.
      </div>
      <div
        v-else-if="googleToast === 'denied'"
        class="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        Google access was denied. You can try connecting again when you’re ready.
      </div>
      <div
        v-if="wizardError"
        class="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        {{ wizardError }}
      </div>

      <!-- Step 1: Connect Google (GA anchor) -->
      <section v-if="stepIndex === 0" class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-medium text-surface-900">1. Connect Google</h2>
        <p class="mt-1 text-sm text-surface-500">
          We use one Google login for Analytics, Search Console, and other Google tools for this site.
        </p>
        <div class="mt-6">
          <SiteIntegrationCard
            :site-id="site.id"
            provider="google_analytics"
            :integration="integrationByProvider('google_analytics')"
            :google-status="googleStatus"
            :other-connected-site="otherConnectedSite"
            google-after-connect="setup"
            @updated="refreshAll"
          />
        </div>
        <div v-if="googleStatus?.connected" class="mt-5">
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
            @click="confirmGoogleStep"
          >
            Confirm this Google account
          </button>
        </div>
      </section>

      <!-- Step 2: GA4 property -->
      <section v-else-if="stepIndex === 1" class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-medium text-surface-900">2. Google Analytics 4 property</h2>
        <p class="mt-1 text-sm text-surface-500">Pick the GA4 property you want to use for this site.</p>
        <p class="mt-4 text-sm text-surface-600">
          <button
            type="button"
            class="text-primary-600 hover:underline"
            :disabled="disconnecting"
            @click="handleDisconnect"
          >
            Use a different Google account
          </button>
        </p>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <select
            v-model="propertySelectId"
            class="min-w-[240px] rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            :disabled="propertiesLoading"
          >
            <option value="">
              {{ propertiesLoading ? 'Loading properties…' : properties.length ? '— Select property —' : 'Load properties' }}
            </option>
            <option v-for="p in properties" :key="p.id" :value="p.id">
              {{ p.name }}{{ p.accountName ? ` (${p.accountName})` : '' }}
            </option>
          </select>
          <button
            v-if="!properties.length && !propertiesLoading"
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
            @click="loadProperties"
          >
            Load properties
          </button>
          <button
            v-else-if="propertySelectId"
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="propertySaving"
            @click="saveProperty"
          >
            {{ propertySaving ? 'Saving…' : 'Confirm this property' }}
          </button>
        </div>
        <p v-if="propertyError" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{{ propertyError }}</p>
        <p v-if="propertiesHint" class="mt-2 text-sm text-surface-600">{{ propertiesHint }}</p>
        <button
          type="button"
          class="mt-5 text-sm font-medium text-surface-600 underline hover:text-surface-900"
          @click="skipGa"
        >
          Skip for now
        </button>
      </section>

      <!-- Step 3: Search Console -->
      <section v-else-if="stepIndex === 2" class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-medium text-surface-900">3. Search Console property</h2>
        <p class="mt-1 text-sm text-surface-500">Choose the Search Console property you want to use for this site.</p>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <select
            v-model="gscSelectUrl"
            class="min-w-[240px] rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            :disabled="gscSitesLoading"
          >
            <option value="">
              {{ gscSitesLoading ? 'Loading properties…' : gscSites.length ? '— Select property —' : 'Load properties' }}
            </option>
            <option v-for="s in gscSites" :key="s.siteUrl" :value="s.siteUrl">
              {{ s.siteUrl }}
            </option>
          </select>
          <button
            v-if="!gscSites.length && !gscSitesLoading"
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
            @click="loadGscSites"
          >
            Load properties
          </button>
          <button
            v-else-if="gscSelectUrl"
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="gscSaving"
            @click="saveGscSite"
          >
            {{ gscSaving ? 'Saving…' : 'Confirm this property' }}
          </button>
        </div>
        <p v-if="gscError" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{{ gscError }}</p>
        <div class="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            class="text-sm font-medium text-surface-600 underline hover:text-surface-900"
            @click="skipGsc"
          >
            Skip for now
          </button>
        </div>
      </section>

      <!-- Step 4: Google Business Profile -->
      <section v-else-if="stepIndex === 3" class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-medium text-surface-900">4. Google Business Profile</h2>
        <p class="mt-1 text-sm text-surface-500">
          Connect Google Business Profile for calls, directions, and profile visibility reporting.
        </p>
        <div class="mt-6">
          <SiteIntegrationCard
            :site-id="site.id"
            provider="google_business_profile"
            :integration="integrationByProvider('google_business_profile')"
            :google-status="googleStatus"
            google-after-connect="setup"
            @updated="refreshAll"
          />
        </div>
        <div class="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="!isIntegrationConnected('google_business_profile')"
            @click="confirmGbpStep"
          >
            Confirm Business Profile setup
          </button>
          <NuxtLink :to="`/sites/${site.id}/business-profile`" class="text-sm font-medium text-primary-600 underline hover:text-primary-700">
            Open Business Profile setup
          </NuxtLink>
        </div>
        <button
          type="button"
          class="mt-5 text-sm font-medium text-surface-600 underline hover:text-surface-900"
          @click="skipGbp"
        >
          Skip for now
        </button>
      </section>

      <!-- Step 5: WooCommerce -->
      <section v-else-if="stepIndex === 4" class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-medium text-surface-900">5. WooCommerce</h2>
        <p class="mt-1 text-sm text-surface-500">
          Connect WooCommerce to include ecommerce and order metrics in reports.
        </p>
        <div class="mt-6">
          <SiteIntegrationCard
            :site-id="site.id"
            provider="woocommerce"
            :integration="integrationByProvider('woocommerce')"
            @updated="refreshAll"
          />
        </div>
        <div class="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="!isIntegrationConnected('woocommerce')"
            @click="confirmWooCommerceStep"
          >
            Confirm WooCommerce setup
          </button>
          <NuxtLink :to="`/sites/${site.id}/woocommerce`" class="text-sm font-medium text-primary-600 underline hover:text-primary-700">
            Open WooCommerce setup
          </NuxtLink>
        </div>
        <button
          type="button"
          class="mt-5 text-sm font-medium text-surface-600 underline hover:text-surface-900"
          @click="skipWooCommerce"
        >
          Skip for now
        </button>
      </section>

      <!-- Step 6: Google Ads -->
      <section v-else-if="stepIndex === 5" class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-medium text-surface-900">6. Google Ads</h2>
        <p class="mt-1 text-sm text-surface-500">
          Connect Google Ads to unlock paid campaign reporting in the site dashboard.
        </p>
        <div class="mt-6">
          <SiteIntegrationCard
            :site-id="site.id"
            provider="google_ads"
            :integration="integrationByProvider('google_ads')"
            :google-status="googleStatus"
            google-after-connect="setup"
            @updated="refreshAll"
          />
        </div>
        <div class="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="!isIntegrationConnected('google_ads')"
            @click="confirmAdsStep"
          >
            Confirm Ads setup
          </button>
          <NuxtLink :to="`/sites/${site.id}/ads`" class="text-sm font-medium text-primary-600 underline hover:text-primary-700">
            Open Google Ads setup
          </NuxtLink>
        </div>
        <button
          type="button"
          class="mt-5 text-sm font-medium text-surface-600 underline hover:text-surface-900"
          @click="skipAds"
        >
          Skip for now
        </button>
      </section>

      <!-- Done -->
      <section v-else class="rounded-xl border border-green-200 bg-green-50/80 p-6 shadow-sm">
        <h2 class="text-lg font-medium text-green-900">You’re set</h2>
        <p class="mt-1 text-sm text-green-800">
          Setup is complete. You can manage any integration later from site settings.
        </p>
        <NuxtLink
          :to="`/sites/${site.id}/dashboard`"
          class="mt-6 inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
        >
          Open analytics dashboard
        </NuxtLink>
        <NuxtLink
          :to="`/sites/${site.id}`"
          class="ml-4 text-sm font-medium text-green-800 underline hover:text-green-950"
        >
          Back to site overview
        </NuxtLink>
      </section>

      <div class="mt-8 border-t border-surface-200 pt-6">
        <div class="mb-4 flex items-center justify-between">
          <button
            type="button"
            class="rounded-lg border border-surface-200 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
            :disabled="stepIndex <= 0"
            @click="goToPrevStep"
          >
            Previous
          </button>
          <button
            v-if="stepIndex < 6"
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="stepIndex >= 6 || !canAdvance"
            @click="goToNextStep"
          >
            Next
          </button>
        </div>
        <NuxtLink to="/sites" class="text-sm font-medium text-surface-600 hover:text-surface-900">← My Sites</NuxtLink>
      </div>
    </template>

    <div v-else-if="!pending && site && !allowed" class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-600">Only agency team members can run site setup.</p>
      <NuxtLink :to="`/sites/${siteId}`" class="mt-4 inline-block text-primary-600 hover:underline">Go to site</NuxtLink>
    </div>

    <div v-else-if="!pending && !site" class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-500">Site not found.</p>
      <NuxtLink to="/sites" class="mt-4 inline-block text-primary-600 hover:underline">My Sites</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord, IntegrationProvider, IntegrationRecord } from '~/types'
import { getSite, listSites } from '~/services/sites'
import { listIntegrationsBySite } from '~/services/integrations'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'
import { getApiErrorMessage } from '~/utils/apiError'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()

const {
  getStatus,
  getProperties,
  selectProperty,
  disconnect,
  getOtherConnectedSite,
  getGscSites,
  selectGscSite,
} = useGoogleIntegration()

const site = ref<SiteRecord | null>(null)
const workspaceRole = ref<'owner' | 'member' | 'client' | null>(null)
const pending = ref(true)
const integrations = ref<IntegrationRecord[]>([])
const googleStatus = ref<Awaited<ReturnType<typeof getStatus>> | null>(null)
const otherConnectedSite = ref<{ otherSiteId: string; otherSiteName: string | null } | null>(null)

const googleToast = ref<'connected' | 'error' | 'denied' | null>(null)

const properties = ref<Array<{ id: string; name: string; accountName?: string }>>([])
const propertiesLoading = ref(false)
const propertiesHint = ref('')
const propertySelectId = ref('')
const propertySaving = ref(false)
const propertyError = ref('')
const disconnecting = ref(false)

const gscSites = ref<Array<{ siteUrl: string; permissionLevel?: string }>>([])
const gscSitesLoading = ref(false)
const gscSelectUrl = ref('')
const gscSaving = ref(false)
const gscError = ref('')
const wizardError = ref('')

const allowed = computed(() => {
  if (!site.value) return false
  if (workspaceRole.value === 'client') return false
  if (site.value.canWrite === false) return false
  return true
})

const confirmedGoogleStep = ref(false)
const confirmedGaStep = ref(false)
const confirmedGscStep = ref(false)
const confirmedGbpStep = ref(false)
const confirmedWooCommerceStep = ref(false)
const confirmedAdsStep = ref(false)
const currentStep = ref(0)

const stepLabels = ['Connect Google', 'GA4 property', 'Search Console', 'Business Profile', 'WooCommerce', 'Google Ads', 'Done']

function googleProviderConnected(provider: 'google_analytics' | 'google_search_console' | 'google_business_profile' | 'google_ads'): boolean {
  return googleStatus.value?.providers?.[provider]?.status === 'connected'
}

function isIntegrationConnected(provider: IntegrationProvider): boolean {
  if (provider === 'google_analytics' || provider === 'google_search_console' || provider === 'google_business_profile' || provider === 'google_ads') {
    return googleProviderConnected(provider)
  }
  const integration = integrationByProvider(provider)
  if (!integration || integration.status !== 'connected') return false
  if (provider === 'woocommerce') {
    const cfg = integration.config_json as { store_url?: string } | null
    return typeof cfg?.store_url === 'string' && cfg.store_url.trim().length > 0
  }
  return true
}

const firstUnconfirmedStep = computed(() => {
  if (!confirmedGoogleStep.value) return 0
  if (!confirmedGaStep.value) return 1
  if (!confirmedGscStep.value) return 2
  if (!confirmedGbpStep.value) return 3
  if (!confirmedWooCommerceStep.value) return 4
  if (!confirmedAdsStep.value) return 5
  return 6
})

const stepIndex = computed(() => currentStep.value)
const canAdvance = computed(() => {
  if (stepIndex.value === 0) return confirmedGoogleStep.value
  if (stepIndex.value === 1) return confirmedGaStep.value
  if (stepIndex.value === 2) return confirmedGscStep.value
  if (stepIndex.value === 3) return confirmedGbpStep.value
  if (stepIndex.value === 4) return confirmedWooCommerceStep.value
  if (stepIndex.value === 5) return confirmedAdsStep.value
  return true
})

function goToStep(step: number) {
  const target = Math.min(6, Math.max(0, step))
  currentStep.value = Math.min(target, firstUnconfirmedStep.value)
  wizardError.value = ''
}

function goToPrevStep() {
  goToStep(stepIndex.value - 1)
}

function goToNextStep() {
  if (!canAdvance.value) return
  goToStep(stepIndex.value + 1)
}

function confirmGoogleStep() {
  wizardError.value = ''
  if (!googleStatus.value?.connected) {
    wizardError.value = 'Connect Google first.'
    return
  }
  confirmedGoogleStep.value = true
}

function confirmGbpStep() {
  wizardError.value = ''
  if (!isIntegrationConnected('google_business_profile')) {
    wizardError.value = 'Choose a Business Profile location first, then confirm this step.'
    return
  }
  confirmedGbpStep.value = true
}

function confirmWooCommerceStep() {
  wizardError.value = ''
  if (!isIntegrationConnected('woocommerce')) {
    wizardError.value = 'Configure WooCommerce first, then confirm this step.'
    return
  }
  confirmedWooCommerceStep.value = true
}

function confirmAdsStep() {
  wizardError.value = ''
  if (!isIntegrationConnected('google_ads')) {
    wizardError.value = 'Choose a Google Ads account first, then confirm this step.'
    return
  }
  confirmedAdsStep.value = true
}

function integrationByProvider(provider: IntegrationProvider): IntegrationRecord | undefined {
  return integrations.value.find((i) => i.provider === provider)
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

async function refreshAll() {
  await loadIntegrations()
  await loadGoogleStatus()
  await loadOtherConnectedSite()
}

async function loadProperties() {
  if (!site.value) return
  propertiesLoading.value = true
  propertyError.value = ''
  propertiesHint.value = ''
  try {
    const res = await getProperties(site.value.id) as { properties?: typeof properties.value; hint?: string }
    properties.value = res.properties ?? []
    propertiesHint.value = res.hint ?? ''
    if (properties.value.length && !propertySelectId.value) {
      propertySelectId.value = properties.value[0].id
    }
  } catch (e) {
    propertyError.value = getApiErrorMessage(e)
  } finally {
    propertiesLoading.value = false
  }
}

async function saveProperty() {
  if (!site.value || !propertySelectId.value) return
  const p = properties.value.find((x) => x.id === propertySelectId.value)
  propertySaving.value = true
  propertyError.value = ''
  wizardError.value = ''
  try {
    await selectProperty(site.value.id, propertySelectId.value, p?.name ?? propertySelectId.value)
    await loadGoogleStatus()
    confirmedGaStep.value = true
    goToNextStep()
  } catch (e) {
    propertyError.value = e instanceof Error ? e.message : 'Failed to save property'
  } finally {
    propertySaving.value = false
  }
}

async function handleDisconnect() {
  if (!site.value) return
  disconnecting.value = true
  try {
    await disconnect(site.value.id)
    properties.value = []
    propertySelectId.value = ''
    gscSites.value = []
    gscSelectUrl.value = ''
    confirmedGoogleStep.value = false
    confirmedGaStep.value = false
    confirmedGscStep.value = false
    confirmedGbpStep.value = false
    confirmedWooCommerceStep.value = false
    confirmedAdsStep.value = false
    currentStep.value = 0
    await refreshAll()
  } finally {
    disconnecting.value = false
  }
}

async function loadGscSites() {
  if (!site.value) return
  gscSitesLoading.value = true
  gscError.value = ''
  try {
    const res = await getGscSites(site.value.id)
    gscSites.value = res.sites ?? []
    if (gscSites.value.length && !gscSelectUrl.value) {
      gscSelectUrl.value = gscSites.value[0].siteUrl
    }
  } catch (e) {
    gscError.value = getApiErrorMessage(e)
  } finally {
    gscSitesLoading.value = false
  }
}

async function saveGscSite() {
  if (!site.value || !gscSelectUrl.value) return
  gscSaving.value = true
  gscError.value = ''
  wizardError.value = ''
  try {
    await selectGscSite(site.value.id, gscSelectUrl.value, gscSelectUrl.value)
    await loadGoogleStatus()
    confirmedGscStep.value = true
    goToNextStep()
  } catch (e) {
    gscError.value = e instanceof Error ? e.message : 'Failed to save Search Console property'
  } finally {
    gscSaving.value = false
  }
}

function skipGsc() {
  confirmedGscStep.value = true
  goToNextStep()
}

function skipGa() {
  confirmedGaStep.value = true
  goToNextStep()
}

function skipGbp() {
  confirmedGbpStep.value = true
  goToNextStep()
}

function skipWooCommerce() {
  confirmedWooCommerceStep.value = true
  goToNextStep()
}

function skipAds() {
  confirmedAdsStep.value = true
  goToNextStep()
}

async function init() {
  pending.value = true
  googleToast.value = null
  wizardError.value = ''
  confirmedGoogleStep.value = false
  confirmedGaStep.value = false
  confirmedGscStep.value = false
  confirmedGbpStep.value = false
  confirmedWooCommerceStep.value = false
  confirmedAdsStep.value = false
  currentStep.value = 0
  try {
    const { role } = await listSites(pb)
    workspaceRole.value = role
    site.value = await getSite(pb, siteId.value)
    if (!site.value) return
    if (workspaceRole.value === 'client' || site.value.canWrite === false) {
      await navigateTo(`/sites/${siteId.value}`)
      return
    }
    await refreshAll()
    const q = route.query.google as string | undefined
    if (q === 'connected') {
      googleToast.value = 'connected'
      if (typeof window !== 'undefined') window.history.replaceState({}, '', route.path)
    } else if (q === 'error') {
      googleToast.value = 'error'
      if (typeof window !== 'undefined') window.history.replaceState({}, '', route.path)
    } else if (q === 'denied') {
      googleToast.value = 'denied'
      if (typeof window !== 'undefined') window.history.replaceState({}, '', route.path)
    }

    if (googleStatus.value?.selectedProperty?.id) {
      propertySelectId.value = googleStatus.value.selectedProperty.id
    }
    if (googleStatus.value?.selectedSearchConsoleSite?.siteUrl) {
      gscSelectUrl.value = googleStatus.value.selectedSearchConsoleSite.siteUrl
    }
    // If Google is already connected (especially after OAuth return), skip step 1
    // and take the user directly to GA property selection on the wizard.
    if (googleStatus.value?.connected) {
      confirmedGoogleStep.value = true
    }
    if (googleStatus.value?.connected) {
      await loadProperties()
    }
    if (googleStatus.value?.connected) {
      await loadGscSites()
    }
    currentStep.value = firstUnconfirmedStep.value
  } finally {
    pending.value = false
  }
}

watch(
  () => firstUnconfirmedStep.value,
  (next, prev) => {
    if (currentStep.value === prev) {
      currentStep.value = next
    }
  }
)

watch(
  () => stepIndex.value,
  async (s) => {
    if (s === 1 && googleStatus.value?.connected && !properties.value.length && !propertiesLoading.value) {
      await loadProperties()
    }
    if (s === 2 && googleStatus.value?.connected && !gscSites.value.length && !gscSitesLoading.value) {
      await loadGscSites()
    }
  }
)

onMounted(() => init())
watch(siteId, () => init())
</script>
