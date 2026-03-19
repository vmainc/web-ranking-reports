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

    <section class="mb-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-surface-900">Agency logo</h2>
      <p class="mt-2 text-sm text-surface-500">
        This logo appears on all reports. Individual sites can still use their own logo in Site Settings.
      </p>
      <div class="mt-4 flex flex-wrap items-start gap-6">
        <div class="flex h-14 w-40 shrink-0 items-center justify-center overflow-hidden rounded border border-surface-200 bg-surface-50">
          <img
            v-if="agencyLogoPreview"
            :src="agencyLogoPreview"
            alt="Agency logo"
            class="h-full w-full object-contain object-left"
          />
          <span v-else class="text-xs text-surface-400">No logo set</span>
        </div>
        <div class="min-w-0 flex-1">
          <input
            ref="agencyLogoInput"
            type="file"
            accept="image/*"
            class="block w-full text-sm text-surface-600 file:mr-3 file:rounded file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
            @change="onAgencyLogoFileChange"
          />
          <p class="mt-2 text-xs text-surface-500">Max 2MB. PNG, JPG or GIF.</p>
          <button
            type="button"
            class="mt-3 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="agencyLogoUploading || !agencyLogoFile"
            @click="uploadAgencyLogo"
          >
            {{ agencyLogoUploading ? 'Uploading…' : 'Upload agency logo' }}
          </button>
          <p v-if="agencyLogoError" class="mt-2 text-sm text-red-600">{{ agencyLogoError }}</p>
          <p v-if="agencyLogoSuccess" class="mt-2 text-sm text-green-600">Agency logo updated.</p>
        </div>
      </div>
    </section>

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
      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="rounded-lg border border-surface-300 px-4 py-2.5 text-sm font-semibold text-surface-700 hover:bg-surface-100"
          @click="handleLogout"
        >
          Log out
        </button>
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
const { user, logout } = useAuthState()
const router = useRouter()

const form = reactive({
  name: '',
  password: '',
  passwordConfirm: '',
})
const error = ref('')
const success = ref('')
const saving = ref(false)
const agencyLogoPreview = ref<string | null>(null)
const agencyLogoFile = ref<File | null>(null)
const agencyLogoInput = ref<HTMLInputElement | null>(null)
const agencyLogoUploading = ref(false)
const agencyLogoError = ref('')
const agencyLogoSuccess = ref(false)

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Prefill from current user
watch(
  user,
  (u) => {
    const model = u as { name?: string } | null
    if (model?.name !== undefined) form.name = model.name ?? ''
  },
  { immediate: true }
)

onMounted(() => {
  loadAgencyLogoPreview()
})

onBeforeUnmount(() => {
  if (agencyLogoPreview.value) {
    URL.revokeObjectURL(agencyLogoPreview.value)
    agencyLogoPreview.value = null
  }
})

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

async function handleLogout() {
  logout()
  await router.push('/auth/login')
}

async function loadAgencyLogoPreview() {
  if (agencyLogoPreview.value) {
    URL.revokeObjectURL(agencyLogoPreview.value)
    agencyLogoPreview.value = null
  }
  try {
    const blob = await $fetch<Blob>('/api/agency/logo', { headers: authHeaders(), responseType: 'blob' })
    if (blob?.size) agencyLogoPreview.value = URL.createObjectURL(blob)
  } catch {
    // No logo set
  }
}

function onAgencyLogoFileChange(e: Event) {
  agencyLogoError.value = ''
  agencyLogoSuccess.value = false
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) {
    agencyLogoFile.value = null
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    agencyLogoError.value = 'File must be under 2MB.'
    agencyLogoFile.value = null
    return
  }
  agencyLogoFile.value = file
}

async function uploadAgencyLogo() {
  const file = agencyLogoFile.value
  if (!file) return
  agencyLogoError.value = ''
  agencyLogoSuccess.value = false
  agencyLogoUploading.value = true
  try {
    const formData = new FormData()
    formData.append('logo', file)
    await $fetch('/api/admin/agency/logo', {
      method: 'POST',
      body: formData,
      headers: authHeaders(),
    })
    agencyLogoSuccess.value = true
    agencyLogoFile.value = null
    if (agencyLogoInput.value) agencyLogoInput.value.value = ''
    await loadAgencyLogoPreview()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    agencyLogoError.value = err?.data?.message ?? err?.message ?? 'Upload failed'
  } finally {
    agencyLogoUploading.value = false
  }
}
</script>
