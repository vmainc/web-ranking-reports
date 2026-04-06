<template>
  <NuxtLayout name="auth">
    <div class="rounded-2xl border border-surface-200 bg-white p-8 shadow-card">
      <h1 class="mb-2 text-xl font-semibold text-surface-900">Choose your password</h1>
      <p class="mb-6 text-sm text-surface-500">Enter a new password for your account, then sign in.</p>

      <form v-if="token" class="space-y-4" @submit.prevent="submit">
        <div>
          <label for="password" class="mb-1 block text-sm font-medium text-surface-700">New password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 shadow-sm ring-1 ring-transparent transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label for="password2" class="mb-1 block text-sm font-medium text-surface-700">Confirm password</label>
          <input
            id="password2"
            v-model="passwordConfirm"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 shadow-sm ring-1 ring-transparent transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="Repeat password"
          />
        </div>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:opacity-50"
        >
          {{ loading ? 'Saving…' : 'Save password' }}
        </button>
      </form>

      <div v-else class="space-y-4">
        <p class="text-sm text-red-600">This reset link is missing a token. Open the link from your email again, or request a new one from the sign-in page.</p>
        <NuxtLink
          to="/auth/forgot-password"
          class="inline-block w-full rounded-lg bg-primary-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-primary-500"
        >
          Request reset link
        </NuxtLink>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const router = useRouter()
const pb = usePocketbase()

const token = computed(() => {
  const q = route.query
  const t = q.token ?? q.passwordToken ?? q.passwordResetToken
  return typeof t === 'string' && t.length > 0 ? t : ''
})

const password = ref('')
const passwordConfirm = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  if (password.value !== passwordConfirm.value) {
    error.value = 'Passwords do not match.'
    return
  }
  loading.value = true
  try {
    await pb.collection('users').confirmPasswordReset(token.value, password.value, passwordConfirm.value)
    await router.push({ path: '/auth/login', query: { reset: '1' } })
  } catch (e: unknown) {
    const err = e as { message?: string; data?: { message?: string } }
    error.value = err?.data?.message || err?.message || 'Could not reset password. The link may have expired—request a new one.'
  } finally {
    loading.value = false
  }
}
</script>
