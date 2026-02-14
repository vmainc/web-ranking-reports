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
      </template>
      <template v-else>
        <p v-if="connectError" class="mb-2 text-sm text-red-600">{{ connectError }}</p>
        <button
          type="button"
          class="w-full rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
          :disabled="busy"
          @click="connect"
        >
          {{ busy ? 'Connecting…' : 'Connect' }}
        </button>
      </template>
    </div>
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

const GOOGLE_PROVIDERS = ['google_analytics', 'google_search_console'] as const
const isGoogle = (p: string): p is (typeof GOOGLE_PROVIDERS)[number] =>
  GOOGLE_PROVIDERS.includes(p as (typeof GOOGLE_PROVIDERS)[number])

const props = withDefaults(
  defineProps<{
    siteId: string
    provider: IntegrationProvider
    integration?: IntegrationRecord | undefined
    googleStatus?: GoogleStatusResponse | null
  }>(),
  { googleStatus: null }
)

const emit = defineEmits(['updated'])

const pb = usePocketbase()
const { redirectToGoogle, disconnect: googleDisconnect } = useGoogleIntegration()
const busy = ref(false)
const connectError = ref('')

const providerLabel = computed(() => getProviderLabel(props.provider))

const effectiveStatus = computed(() => {
  if (isGoogle(props.provider) && props.googleStatus) {
    const p = props.googleStatus.providers[props.provider]
    return p?.status ?? 'disconnected'
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
  if (props.provider === 'google_analytics') return `/sites/${props.siteId}/analytics`
  if (props.provider === 'google_search_console') return `/sites/${props.siteId}/search-console`
  return `/sites/${props.siteId}/integrations/${props.provider}`
})

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
</script>
