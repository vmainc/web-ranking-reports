<template>
  <div
    class="flex flex-col rounded-xl border border-surface-200 bg-white p-5 shadow-card transition hover:shadow-card-hover"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 flex-1">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-surface-400"
          :class="iconBgClass"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.172-1.172a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.172 1.172z" />
          </svg>
        </div>
        <div class="ml-3 min-w-0">
          <h3 class="font-medium text-surface-900">{{ providerLabel }}</h3>
          <p class="mt-0.5 text-sm" :class="statusClass">{{ statusLabel }}</p>
        </div>
      </div>
      <!-- WooCommerce / Bing: cog to configure (when connected, show next to title) -->
      <button
        v-if="isWooCommerce(provider) || isBingWebmaster(provider)"
        type="button"
        class="shrink-0 rounded p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-600"
        title="Configure API"
        @click="isWooCommerce(provider) ? openWooCommerceConfig() : openBingConfig()"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
    <div class="mt-4 flex flex-col gap-2">
      <template v-if="effectiveConnected">
        <NuxtLink
          v-if="viewRoute"
          :to="viewRoute"
          class="flex items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
        >
          View
        </NuxtLink>
        <button
          type="button"
          class="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm font-medium text-surface-600 hover:bg-surface-50"
          :disabled="busy"
          @click="disconnect"
        >
          {{ busy ? 'Updating…' : 'Disconnect' }}
        </button>
        <p v-if="isGoogle(provider)" class="text-xs text-surface-500">Remove to connect a different Google account.</p>
      </template>
      <template v-else>
        <p v-if="connectError" class="mb-2 text-sm text-red-600">{{ connectError }}</p>
        <template v-if="isGoogle(provider) && otherConnectedSite">
          <p class="mb-2 text-xs text-surface-500">Use your connected Google account for this site; then pick a property or location in View.</p>
          <button
            type="button"
            class="w-full rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
            :disabled="busy"
            @click="useExistingAccount"
          >
            {{ busy ? 'Applying…' : `Use my Google account${otherConnectedSite.otherSiteName ? ` (from ${otherConnectedSite.otherSiteName})` : ''}` }}
          </button>
          <button
            type="button"
            class="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm font-medium text-surface-600 hover:bg-surface-50 disabled:opacity-50"
            :disabled="busy"
            @click="connect"
          >
            Connect a different Google account
          </button>
        </template>
        <button
          v-else-if="isWooCommerce(provider)"
          type="button"
          class="flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
          :disabled="busy"
          @click="openWooCommerceConfig"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Configure
        </button>
        <button
          v-else-if="isBingWebmaster(provider)"
          type="button"
          class="flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
          :disabled="busy"
          @click="openBingConfig"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Configure
        </button>
        <button
          v-else
          type="button"
          class="w-full rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
          :disabled="busy"
          @click="connect"
        >
          {{ busy ? 'Connecting…' : 'Connect' }}
        </button>
      </template>
    </div>

    <!-- WooCommerce API config modal -->
    <Teleport to="body">
      <div
        v-if="showWooCommerceModal && isWooCommerce(provider)"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showWooCommerceModal = false"
      >
        <div
          class="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-6 shadow-xl"
          role="dialog"
          aria-labelledby="wc-modal-title"
        >
          <h3 id="wc-modal-title" class="text-lg font-semibold text-surface-900">WooCommerce API</h3>
          <p class="mt-1 text-sm text-surface-500">
            Add your API keys from WooCommerce → Settings → Advanced → REST API. Store URL is optional — leave blank to use this site’s domain.
          </p>
          <form class="mt-4 space-y-4" @submit.prevent="saveWooCommerceConfig">
            <div>
              <label for="wc-store-url" class="block text-sm font-medium text-surface-700">Store URL (optional)</label>
              <input
                id="wc-store-url"
                v-model="wcForm.store_url"
                type="url"
                placeholder="https://yourstore.com — or leave blank to use this site"
                class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label for="wc-consumer-key" class="block text-sm font-medium text-surface-700">Consumer key</label>
              <input
                id="wc-consumer-key"
                v-model="wcForm.consumer_key"
                type="text"
                required
                autocomplete="off"
                placeholder="ck_..."
                class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label for="wc-consumer-secret" class="block text-sm font-medium text-surface-700">Consumer secret</label>
              <input
                id="wc-consumer-secret"
                v-model="wcForm.consumer_secret"
                type="password"
                autocomplete="off"
                placeholder="cs_... (leave blank to keep current)"
                class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <p v-if="wcConfigError" class="text-sm text-red-600">{{ wcConfigError }}</p>
            <div class="flex gap-3 pt-2">
              <button
                type="submit"
                class="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
                :disabled="wcSaving"
              >
                {{ wcSaving ? 'Saving…' : 'Save' }}
              </button>
              <button
                type="button"
                class="rounded-lg border border-surface-200 px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-50"
                @click="showWooCommerceModal = false"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Bing Webmaster API key modal -->
      <div
        v-if="showBingModal && isBingWebmaster(provider)"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showBingModal = false"
      >
        <div
          class="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-6 shadow-xl"
          role="dialog"
          aria-labelledby="bing-modal-title"
        >
          <h3 id="bing-modal-title" class="text-lg font-semibold text-surface-900">Bing Webmaster Tools</h3>
          <p class="mt-1 text-sm text-surface-500">
            Add your API key from
            <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener" class="text-primary-600 underline">Bing Webmaster Tools</a>
            → Settings (gear) → API Access → Generate API Key.
          </p>
          <form class="mt-4 space-y-4" @submit.prevent="saveBingConfig">
            <div>
              <label for="bing-api-key" class="block text-sm font-medium text-surface-700">API key</label>
              <input
                id="bing-api-key"
                v-model="bingForm.api_key"
                type="password"
                required
                autocomplete="off"
                placeholder="Your Bing Webmaster API key"
                class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <p v-if="bingConfigError" class="text-sm text-red-600">{{ bingConfigError }}</p>
            <div class="flex gap-3 pt-2">
              <button
                type="submit"
                class="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
                :disabled="bingSaving"
              >
                {{ bingSaving ? 'Saving…' : 'Save' }}
              </button>
              <button
                type="button"
                class="rounded-lg border border-surface-200 px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-50"
                @click="showBingModal = false"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { IntegrationRecord, IntegrationProvider } from '~/types'
import type { GoogleStatusResponse } from '~/composables/useGoogleIntegration'
import {
  getProviderLabel,
  getStatusLabel,
  ensureIntegration,
  connectIntegration,
  disconnectIntegration,
} from '~/services/integrations'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'

const GOOGLE_PROVIDERS = ['google_analytics', 'google_search_console', 'lighthouse', 'google_business_profile', 'google_ads'] as const
const isGoogle = (p: string): p is (typeof GOOGLE_PROVIDERS)[number] =>
  GOOGLE_PROVIDERS.includes(p as (typeof GOOGLE_PROVIDERS)[number])

const isWooCommerce = (p: string): p is 'woocommerce' => p === 'woocommerce'
const isBingWebmaster = (p: string): p is 'bing_webmaster' => p === 'bing_webmaster'

const props = withDefaults(
  defineProps<{
    siteId: string
    provider: IntegrationProvider
    integration?: IntegrationRecord | undefined
    googleStatus?: GoogleStatusResponse | null
    /** When GA is disconnected, pass another site that has GA so user can "Use existing account". */
    otherConnectedSite?: { otherSiteId: string; otherSiteName: string | null } | null
  }>(),
  { googleStatus: null, otherConnectedSite: null }
)

const emit = defineEmits(['updated'])

const pb = usePocketbase()
const { redirectToGoogle, disconnect: googleDisconnect, copyConnection } = useGoogleIntegration()
const busy = ref(false)
const connectError = ref('')

const showWooCommerceModal = ref(false)
const wcForm = ref({ store_url: '', consumer_key: '', consumer_secret: '' })
const wcConfigError = ref('')
const wcSaving = ref(false)
const showBingModal = ref(false)
const bingForm = ref({ api_key: '' })
const bingConfigError = ref('')
const bingSaving = ref(false)

const otherConnectedSite = computed(() => props.otherConnectedSite ?? null)

const providerLabel = computed(() => getProviderLabel(props.provider))

const effectiveStatus = computed(() => {
  if (isGoogle(props.provider) && props.googleStatus) {
    const p = props.googleStatus.providers[props.provider]
    return p?.status ?? 'disconnected'
  }
  if (isWooCommerce(props.provider)) {
    const hasConfig = props.integration?.config_json && typeof (props.integration.config_json as { store_url?: string }).store_url === 'string' && (props.integration.config_json as { store_url: string }).store_url.trim().length > 0
    return props.integration?.status === 'connected' && hasConfig ? 'connected' : 'disconnected'
  }
  if (isBingWebmaster(props.provider)) {
    const hasConfig = props.integration?.config_json && typeof (props.integration.config_json as { api_key?: string }).api_key === 'string' && (props.integration.config_json as { api_key: string }).api_key.trim().length > 0
    return props.integration?.status === 'connected' && hasConfig ? 'connected' : 'disconnected'
  }
  return props.integration?.status ?? 'disconnected'
})

const effectiveConnected = computed(() => effectiveStatus.value === 'connected')

const statusLabel = computed(() => getStatusLabel(effectiveStatus.value))

const statusClass = computed(() => {
  const s = effectiveStatus.value
  if (s === 'connected') return 'text-green-600'
  if (s === 'error') return 'text-red-600'
  if (s === 'pending') return 'text-amber-600'
  return 'text-surface-500'
})

const iconBgClass = computed(() => {
  if (effectiveStatus.value === 'connected') return 'bg-green-50 text-green-600'
  return 'bg-surface-100'
})

const viewRoute = computed(() => {
  if (!props.siteId || !effectiveConnected.value) return null
  if (props.provider === 'google_analytics') return `/sites/${props.siteId}/dashboard`
  if (props.provider === 'google_search_console') return `/sites/${props.siteId}/search-console`
  if (props.provider === 'lighthouse') return `/sites/${props.siteId}/lighthouse`
  if (props.provider === 'google_business_profile') return `/sites/${props.siteId}/business-profile`
  if (props.provider === 'google_ads') return `/sites/${props.siteId}/ads`
  if (props.provider === 'woocommerce') return `/sites/${props.siteId}/woocommerce`
  if (props.provider === 'bing_webmaster') return `/sites/${props.siteId}/bing-webmaster`
  return `/sites/${props.siteId}/integrations/${props.provider}`
})

async function useExistingAccount() {
  if (!isGoogle(props.provider) || !otherConnectedSite.value?.otherSiteId) return
  connectError.value = ''
  busy.value = true
  try {
    await copyConnection(props.siteId, otherConnectedSite.value.otherSiteId)
    emit('updated')
    await navigateTo(`/sites/${props.siteId}/dashboard?google=connected`)
  } catch (e: unknown) {
    connectError.value = e instanceof Error ? e.message : 'Failed to use existing account.'
  } finally {
    busy.value = false
  }
}

async function connect() {
  connectError.value = ''
  if (isGoogle(props.provider)) {
    busy.value = true
    const result = await redirectToGoogle(props.siteId)
    busy.value = false
    if (!result.ok) connectError.value = result.message
    return
  }
  busy.value = true
  try {
    let rec = props.integration
    if (!rec) {
      rec = await ensureIntegration(pb, props.siteId, props.provider)
    }
    await connectIntegration(pb, rec.id)
    emit('updated')
  } catch {
    // could set local error state
  } finally {
    busy.value = false
  }
}

async function disconnect() {
  if (isGoogle(props.provider)) {
    busy.value = true
    try {
      await googleDisconnect(props.siteId)
      emit('updated')
    } finally {
      busy.value = false
    }
    return
  }
  if (!props.integration) return
  busy.value = true
  try {
    await disconnectIntegration(pb, props.integration.id)
    emit('updated')
  } finally {
    busy.value = false
  }
}

function openWooCommerceConfig() {
  wcConfigError.value = ''
  const cfg = props.integration?.config_json as { store_url?: string; consumer_key?: string; consumer_secret?: string } | undefined
  wcForm.value = {
    store_url: cfg?.store_url?.trim() ?? '',
    consumer_key: cfg?.consumer_key?.trim() ?? '',
    consumer_secret: '', // never prefill secret
  }
  showWooCommerceModal.value = true
}

async function saveWooCommerceConfig() {
  wcConfigError.value = ''
  wcSaving.value = true
  const token = pb.authStore.token
  if (!token) {
    wcConfigError.value = 'You must be logged in to save.'
    wcSaving.value = false
    return
  }
  try {
    await $fetch('/api/woocommerce/config', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        siteId: props.siteId,
        store_url: wcForm.value.store_url.trim() || undefined,
        consumer_key: wcForm.value.consumer_key.trim(),
        consumer_secret: wcForm.value.consumer_secret.trim(),
      },
    })
    showWooCommerceModal.value = false
    emit('updated')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    wcConfigError.value = err?.data?.message ?? err?.message ?? 'Failed to save. Check store URL and API keys.'
  } finally {
    wcSaving.value = false
  }
}

function openBingConfig() {
  bingConfigError.value = ''
  bingForm.value = { api_key: '' }
  showBingModal.value = true
}

async function saveBingConfig() {
  bingConfigError.value = ''
  bingSaving.value = true
  const token = pb.authStore.token
  if (!token) {
    bingConfigError.value = 'You must be logged in to save.'
    bingSaving.value = false
    return
  }
  try {
    await $fetch('/api/bing-webmaster/config', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { siteId: props.siteId, api_key: bingForm.value.api_key.trim() },
    })
    showBingModal.value = false
    emit('updated')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    bingConfigError.value = err?.data?.message ?? err?.message ?? 'Failed to save. Check your API key.'
  } finally {
    bingSaving.value = false
  }
}
</script>
