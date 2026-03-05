<template>
  <div class="mx-auto max-w-xl px-4 py-8 sm:px-6">
    <NuxtLink
      to="/dashboard"
      class="mb-6 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
    >
      ← Dashboard
    </NuxtLink>
    <h1 class="mb-2 text-2xl font-semibold text-surface-900">Account</h1>
    <p class="mb-6 text-sm text-surface-500">
      Update your name and password.
    </p>

    <form class="space-y-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm" @submit.prevent="save">
      <div>
        <label for="account-name" class="block text-sm font-medium text-surface-700">Name</label>
        <input
          id="account-name"
          v-model="form.name"
          type="text"
          autocomplete="name"
          class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Your name"
        />
      </div>

      <div class="border-t border-surface-200 pt-6">
        <h2 class="text-sm font-semibold text-surface-900">Change password</h2>
        <p class="mt-1 text-sm text-surface-500">Leave blank to keep your current password.</p>
        <div class="mt-4 space-y-4">
          <div>
            <label for="account-password" class="block text-sm font-medium text-surface-700">New password</label>
            <input
              id="account-password"
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label for="account-password-confirm" class="block text-sm font-medium text-surface-700">Confirm new password</label>
            <input
              id="account-password-confirm"
              v-model="form.passwordConfirm"
              type="password"
              autocomplete="new-password"
              class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="success" class="text-sm text-green-600">{{ success }}</p>
      <div class="flex justify-end">
        <button
          type="submit"
          :disabled="saving"
          class="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const pb = usePocketbase()
const { user } = useAuthState()

const form = reactive({
  name: '',
  password: '',
  passwordConfirm: '',
})
const error = ref('')
const success = ref('')
const saving = ref(false)

// Prefill from current user
watch(
  user,
  (u) => {
    const model = u as { name?: string } | null
    if (model?.name !== undefined) form.name = model.name ?? ''
  },
  { immediate: true }
)

async function save() {
  error.value = ''
  success.value = ''
  const id = (user.value as { id?: string } | null)?.id
  if (!id) {
    error.value = 'Not signed in.'
    return
  }

  const wantPasswordChange = form.password.trim() !== '' || form.passwordConfirm.trim() !== ''
  if (wantPasswordChange && form.password !== form.passwordConfirm) {
    error.value = 'New password and confirm password do not match.'
    return
  }
  if (wantPasswordChange && form.password.length < 8) {
    error.value = 'Password must be at least 8 characters.'
    return
  }

  saving.value = true
  try {
    const payload: { name?: string; password?: string; passwordConfirm?: string } = {
      name: (form.name.trim() || (user.value as { email?: string })?.email?.split('@')[0]) || '',
    }
    if (wantPasswordChange) {
      payload.password = form.password
      payload.passwordConfirm = form.passwordConfirm
    }
    await pb.collection('users').update(id, payload)
    user.value = (await pb.collection('users').getOne(id)) as Record<string, unknown>
    form.password = ''
    form.passwordConfirm = ''
    success.value = 'Account updated.'
  } catch (e: unknown) {
    const err = e as { message?: string; data?: { data?: { message?: string } } }
    error.value = err?.data?.data?.message ?? err?.message ?? 'Failed to update account.'
  } finally {
    saving.value = false
  }
}
</script>
