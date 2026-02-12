<template>
  <NuxtLayout name="auth">
    <div class="rounded-2xl border border-surface-200 bg-white p-8 shadow-card">
      <h1 class="mb-2 text-xl font-semibold text-surface-900">Sign in</h1>
      <p class="mb-6 text-sm text-surface-500">Use your email and password to access your account.</p>

      <form class="space-y-4" @submit.prevent="submit">
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
            autocomplete="current-password"
            class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 shadow-sm ring-1 ring-transparent transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="••••••••"
          />
        </div>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:opacity-50"
        >
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
      <p class="mt-6 text-center text-sm text-surface-500">
        Don't have an account?
        <NuxtLink to="/auth/register" class="font-medium text-primary-600 hover:underline">
          Sign up
        </NuxtLink>
      </p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const pb = usePocketbase()
const router = useRouter()

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const { loginWithEmail } = await import('~/services/auth')
    await loginWithEmail(pb, { email: email.value, password: password.value })
    await router.push('/dashboard')
  } catch (e: unknown) {
    const err = e as { message?: string }
    error.value = err?.message ?? 'Sign in failed. Check your email and password.'
  } finally {
    loading.value = false
  }
}
</script>
