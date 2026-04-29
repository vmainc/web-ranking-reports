<template>
  <NuxtLayout name="auth">
    <div class="rounded-2xl border border-surface-200 bg-white p-8 shadow-card">
      <h1 class="mb-2 text-xl font-semibold text-surface-900">Sign up</h1>
      <p class="mb-6 text-sm text-surface-500">Create your account and start with the free plan.</p>

      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label for="name" class="mb-1 block text-sm font-medium text-surface-700">Name</label>
          <input
            id="name"
            v-model="name"
            type="text"
            required
            autocomplete="name"
            class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 shadow-sm ring-1 ring-transparent transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="Your name"
          />
        </div>
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
        <div>
          <label for="password" class="mb-1 block text-sm font-medium text-surface-700">Password</label>
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
          <label for="passwordConfirm" class="mb-1 block text-sm font-medium text-surface-700">Confirm password</label>
          <input
            id="passwordConfirm"
            v-model="passwordConfirm"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 shadow-sm ring-1 ring-transparent transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="Repeat your password"
          />
        </div>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:opacity-50"
        >
          {{ loading ? 'Creating account…' : 'Create account' }}
        </button>
      </form>

      <p class="mt-4 text-center text-sm text-surface-600">
        Already have an account?
        <NuxtLink :to="loginLink" class="font-medium text-primary-600 hover:text-primary-500">Sign in</NuxtLink>
      </p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const pb = usePocketbase()
const router = useRouter()
const route = useRoute()

const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const loading = ref(false)
const error = ref('')
const requestedPlan = computed(() => {
  const raw = String(route.query.plan || '').toLowerCase().trim()
  if (raw === 'starter' || raw === 'growth' || raw === 'agency') return raw
  return ''
})
const loginLink = computed(() => (requestedPlan.value ? `/auth/login?plan=${requestedPlan.value}` : '/auth/login'))

async function submit() {
  error.value = ''
  if (password.value !== passwordConfirm.value) {
    error.value = 'Passwords do not match.'
    return
  }
  loading.value = true
  try {
    const { registerWithEmail, loginWithEmail } = await import('~/services/auth')
    await registerWithEmail(pb, {
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value,
      passwordConfirm: passwordConfirm.value,
    })
    await loginWithEmail(pb, { email: email.value.trim(), password: password.value })
    const token = pb.authStore.token
    if (token) {
      await $fetch('/api/subscriptions/bootstrap', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null)
    }
    if (requestedPlan.value) {
      await router.push(`/dashboard/billing?plan=${requestedPlan.value}&autostart=1`)
    } else {
      await router.push('/dashboard')
    }
  } catch (e: unknown) {
    const err = e as { message?: string; data?: { message?: string } }
    error.value = err?.data?.message ?? err?.message ?? 'Could not create your account.'
  } finally {
    loading.value = false
  }
}
</script>
