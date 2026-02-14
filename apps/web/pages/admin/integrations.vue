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
      Configure Google OAuth (client id/secret). Used for Connect Google on site integration cards.
    </p>

    <div v-if="!allowed" class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
      <p>You don’t have access to this page.</p>
      <p v-if="hint" class="mt-2 text-sm">{{ hint }}</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-sm font-medium underline">Back to Dashboard</NuxtLink>
    </div>

    <form v-else class="space-y-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm" @submit.prevent="save">
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
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const pb = usePocketbase()
const form = ref({ client_id: '', client_secret: '' })
const allowed = ref(false)
const hint = ref('')
const saving = ref(false)
const error = ref('')
const success = ref(false)

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
      const settings = await $fetch<{ client_id: string; client_secret: string }>('/api/admin/settings/google-oauth', {
        headers: authHeaders(),
      }).catch(() => ({ client_id: '', client_secret: '' }))
      form.value = { client_id: settings.client_id ?? '', client_secret: settings.client_secret ?? '' }
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
</script>
