<template>
  <NuxtLayout name="auth">
    <div class="rounded-2xl border border-surface-200 bg-white p-8 shadow-card">
      <h1 class="mb-2 text-xl font-semibold text-surface-900">
        {{ route.query.invited === '1' ? 'Finish your invite' : 'Set or reset password' }}
      </h1>
      <div
        v-if="route.query.invited === '1'"
        class="mb-4 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-950"
      >
        You’re almost done. We’ll email you a link to <strong class="font-semibold">choose your password</strong> (not the regular sign-in form). Check spam if it’s slow.
      </div>
      <p v-if="autoSending" class="mb-4 text-sm text-surface-600">Sending your link…</p>
      <p v-else class="mb-6 text-sm text-surface-500">
        Enter the email you use for {{ appName }}. We’ll send a secure link to choose a new password.
      </p>

      <form v-if="!sent" class="space-y-4" @submit.prevent="submit">
        <div>
          <label for="email" class="mb-1 block text-sm font-medium text-surface-700">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 shadow-sm ring-1 ring-transparent transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="you@example.com"
          />
        </div>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:opacity-50"
        >
          {{ loading ? 'Sending…' : 'Send reset link' }}
        </button>
      </form>

      <div v-else class="space-y-4">
        <p class="text-sm text-surface-700">
          If an account exists for <strong>{{ email }}</strong>, we’ve sent an email with a link to set your password. Check your inbox and spam folder.
        </p>
        <NuxtLink
          to="/auth/login"
          class="inline-block w-full rounded-lg border border-surface-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-surface-800 transition hover:bg-surface-50"
        >
          Back to sign in
        </NuxtLink>
      </div>

      <p class="mt-6 text-center text-sm text-surface-500">
        <NuxtLink to="/auth/login" class="font-medium text-primary-600 hover:text-primary-500">Sign in</NuxtLink>
      </p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const router = useRouter()
const pb = usePocketbase()
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const error = ref('')
const loading = ref(false)
const sent = ref(false)
const autoSending = ref(false)

const appName = 'Web Ranking Reports'

async function requestReset(): Promise<boolean> {
  error.value = ''
  loading.value = true
  try {
    await pb.collection('users').requestPasswordReset(email.value.trim().toLowerCase())
    sent.value = true
    return true
  } catch (e: unknown) {
    const err = e as { message?: string; data?: { message?: string } }
    error.value = err?.data?.message || err?.message || 'Something went wrong. Try again or contact your administrator.'
    return false
  } finally {
    loading.value = false
  }
}

async function submit() {
  await requestReset()
}

function stripAutosendFromUrl() {
  const q = { ...route.query } as Record<string, string | string[] | undefined>
  delete q.autosend
  void router.replace({ path: route.path, query: q })
}

onMounted(async () => {
  if (typeof route.query.email === 'string' && route.query.email) {
    email.value = route.query.email
  }
  if (route.query.autosend === '1' && email.value.trim()) {
    autoSending.value = true
    await requestReset()
    autoSending.value = false
    stripAutosendFromUrl()
  }
})
</script>
