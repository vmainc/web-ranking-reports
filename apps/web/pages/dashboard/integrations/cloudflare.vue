<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
    <div class="mb-6">
      <NuxtLink to="/dashboard" class="mb-3 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600">
        ← Dashboard
      </NuxtLink>
      <h1 class="text-2xl font-semibold text-surface-900">Cloudflare integration</h1>
      <p class="mt-1 text-sm text-surface-500">Connect Cloudflare with an API token to pull zone analytics into reports.</p>
    </div>

    <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-card">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-medium text-surface-900">Connection</h2>
        <span
          class="rounded-full px-2.5 py-1 text-xs font-semibold"
          :class="status.connected ? 'bg-green-100 text-green-700' : 'bg-surface-100 text-surface-600'"
        >
          {{ status.connected ? 'Connected' : 'Not connected' }}
        </span>
      </div>

      <p class="mb-4 text-sm text-surface-600">
        Create a token here:
        <a class="text-primary-600 underline" href="https://developers.cloudflare.com/fundamentals/api/get-started/create-token/" target="_blank" rel="noopener">Cloudflare API tokens</a>.
      </p>
      <ul class="mb-4 list-disc pl-5 text-sm text-surface-600">
        <li>Zone.Zone (Read)</li>
        <li>Zone.Analytics (Read)</li>
        <li>Zone.Settings (Read)</li>
      </ul>

      <form class="space-y-4" @submit.prevent="connectCloudflare">
        <div>
          <label for="cf-token" class="block text-sm font-medium text-surface-700">Cloudflare API Token</label>
          <input
            id="cf-token"
            v-model="apiToken"
            type="password"
            required
            autocomplete="off"
            class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="Paste API token"
          />
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
            :disabled="saving"
          >
            {{ saving ? 'Connecting…' : 'Connect Cloudflare' }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-surface-200 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
            :disabled="syncing || !status.connected"
            @click="syncNow"
          >
            {{ syncing ? 'Syncing…' : 'Sync data now' }}
          </button>
        </div>
      </form>

      <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
      <p v-else-if="success" class="mt-3 text-sm text-green-600">{{ success }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const pb = usePocketbase()
const apiToken = ref('')
const saving = ref(false)
const syncing = ref(false)
const error = ref('')
const success = ref('')
const status = ref<{ connected: boolean; accountId?: string | null }>({ connected: false })

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadStatus() {
  status.value = await $fetch('/api/cloudflare/status', { headers: authHeaders() })
}

async function connectCloudflare() {
  error.value = ''
  success.value = ''
  saving.value = true
  try {
    await $fetch('/api/cloudflare/connect', {
      method: 'POST',
      headers: authHeaders(),
      body: { apiToken: apiToken.value.trim() },
    })
    apiToken.value = ''
    await loadStatus()
    success.value = 'Cloudflare connected.'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Failed to connect Cloudflare.'
  } finally {
    saving.value = false
  }
}

async function syncNow() {
  error.value = ''
  success.value = ''
  syncing.value = true
  try {
    const res = await $fetch<{ zones: number }>('/api/cloudflare/sync', {
      method: 'POST',
      headers: authHeaders(),
      body: {},
    })
    success.value = `Synced Cloudflare data for ${res.zones} zone(s).`
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Sync failed.'
  } finally {
    syncing.value = false
  }
}

onMounted(async () => {
  try {
    await loadStatus()
  } catch {
    status.value = { connected: false }
  }
})
</script>

