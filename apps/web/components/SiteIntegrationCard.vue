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
    <div class="mt-4">
      <button
        v-if="integration?.status === 'connected'"
        type="button"
        class="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
        :disabled="busy"
        @click="disconnect"
      >
        {{ busy ? 'Updating…' : 'Disconnect' }}
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
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IntegrationRecord, IntegrationProvider } from '~/types'
import {
  getProviderLabel,
  getStatusLabel,
  ensureIntegration,
  connectIntegration,
  disconnectIntegration,
} from '~/services/integrations'

const props = defineProps<{
  siteId: string
  provider: IntegrationProvider
  integration?: IntegrationRecord | undefined
}>()

const emit = defineEmits(['updated'])

const pb = usePocketbase()
const busy = ref(false)

const providerLabel = computed(() => getProviderLabel(props.provider))
const statusLabel = computed(() =>
  props.integration ? getStatusLabel(props.integration.status) : 'Disconnected'
)
const statusClass = computed(() => {
  const s = props.integration?.status
  if (s === 'connected') return 'text-green-600'
  if (s === 'error') return 'text-red-600'
  if (s === 'pending') return 'text-amber-600'
  return 'text-surface-500'
})

const iconBgClass = computed(() => {
  const s = props.integration?.status
  if (s === 'connected') return 'bg-green-50 text-green-600'
  return 'bg-surface-100'
})

async function connect() {
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
