<template>
  <NuxtLayout name="auth">
    <div class="rounded-2xl border border-surface-200 bg-white p-8 shadow-card">
      <h1 class="mb-2 text-xl font-semibold text-surface-900">Create account</h1>
      <p class="mb-6 text-sm text-surface-500">Enter your details to get started.</p>

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
          <label for="name" class="mb-1 block text-sm font-medium text-surface-700">Name (optional)</label>
          <input
            id="name"
            v-model="name"
            type="text"
            autocomplete="name"
            class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 shadow-sm ring-1 ring-transparent transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="Your name"
          />
        </div>
        <div>
          <label for="password" class="mb-1 block text-sm font-medium text-surface-700">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            autocomplete="new-password"
            minlength="8"
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
            autocomplete="new-password"
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
          {{ loading ? 'Creating account…' : 'Create account' }}
        </button>
      </form>
      <p class="mt-6 text-center text-sm text-surface-500">
        Already have an account?
        <NuxtLink to="/auth/login" class="font-medium text-primary-600 hover:underline">
          Sign in
        </NuxtLink>
      </p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const email = ref('')
const name = ref('')
const password = ref('')
const passwordConfirm = ref('')
const error = ref('')
const loading = ref(false)

const pb = usePocketbase()
const router = useRouter()

async function submit() {
  error.value = ''
  if (password.value !== passwordConfirm.value) {
    error.value = 'Passwords do not match.'
    return
  }
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.'
    return
  }
  loading.value = true
  try {
    const { registerWithEmail } = await import('~/services/auth')
    await registerWithEmail(pb, {
      email: email.value,
      password: password.value,
      passwordConfirm: passwordConfirm.value,
      name: name.value || undefined,
    })
    await loginWithEmail(pb, { email: email.value, password: password.value })
    await router.push('/dashboard')
  } catch (e: unknown) {
    const err = e as { message?: string; data?: { data?: { email?: { message?: string } } } }
    const msg = err?.data?.data?.email?.message ?? err?.message ?? 'Registration failed.'
    error.value = msg
  } finally {
    loading.value = false
  }
}

async function loginWithEmail(pb: import('pocketbase').default, payload: { email: string; password: string }) {
  const { loginWithEmail: doLogin } = await import('~/services/auth')
  await doLogin(pb, payload)
}
</script>
