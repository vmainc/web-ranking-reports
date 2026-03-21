<template>
  <div class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
    <NuxtLink
      to="/dashboard"
      class="mb-6 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
    >
      ← Dashboard
    </NuxtLink>
    <h1 class="mb-2 text-2xl font-semibold text-surface-900">Admin – Emails</h1>
    <p class="mb-6 text-sm text-surface-500">
      SMTP and transactional sender settings live in PocketBase; auth email templates for the <strong>users</strong> collection are edited below.
      Only <strong>admin@vma.agency</strong> can access this page.
    </p>

    <AdminNav />

    <div v-if="allowed === null" class="rounded-xl border border-surface-200 bg-white p-6 text-surface-600">
      <p class="text-sm">Checking access…</p>
    </div>

    <div v-else-if="!allowed" class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
      <p>You don’t have access to this page.</p>
      <p v-if="hint" class="mt-2 text-sm">{{ hint }}</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-sm font-medium underline">Back to Dashboard</NuxtLink>
    </div>

    <template v-else>
      <!-- SMTP / PocketBase -->
      <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-surface-900">SMTP &amp; sender (PocketBase)</h2>
        <p class="mt-2 text-sm text-surface-500">
          Configure the mail server in PocketBase Admin →
          <a :href="pbAdminUrl" target="_blank" rel="noopener" class="text-primary-600 underline">Settings → Mailer</a>.
          Enable SMTP, set host/port/credentials, and set <strong>sender name</strong> and <strong>sender address</strong> under Application.
        </p>
        <p v-if="mailer.settingsWarning" class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Could not read mail settings from PocketBase API: {{ mailer.settingsWarning }}
          Configure SMTP in PocketBase Admin → Settings if needed.
        </p>
        <div v-if="mailerLoaded" class="mt-4 rounded-lg border border-surface-100 bg-surface-50 px-4 py-3 text-sm text-surface-700">
          <p>
            <span class="font-medium">SMTP:</span>
            {{ smtpLine }}
          </p>
          <p class="mt-1">
            <span class="font-medium">From:</span>
            {{ mailer.senderName || '—' }} &lt;{{ mailer.senderAddress || '—' }}&gt;
          </p>
          <p v-if="mailer.appName" class="mt-1 text-surface-600">
            <span class="font-medium">App:</span> {{ mailer.appName }} · {{ mailer.appURL }}
          </p>
        </div>
        <p v-else class="mt-3 text-sm text-surface-500">Loading mailer status…</p>
      </section>

      <!-- Templates -->
      <form class="space-y-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm" @submit.prevent="saveAll">
        <div>
          <h2 class="text-lg font-semibold text-surface-900">Auth email templates</h2>
          <p class="mt-2 text-sm text-surface-500">
            These apply to the PocketBase <strong>users</strong> auth collection (sign-up verification, password reset, email change confirmation).
            Use placeholders such as
            <code class="rounded bg-surface-100 px-1 py-0.5 text-xs">{APP_NAME}</code>,
            <code class="rounded bg-surface-100 px-1 py-0.5 text-xs">{APP_URL}</code>,
            <code class="rounded bg-surface-100 px-1 py-0.5 text-xs">{TOKEN}</code>,
            <code class="rounded bg-surface-100 px-1 py-0.5 text-xs">{ACTION_URL}</code>
            in the body (see
            <a href="https://pocketbase.io/docs/" target="_blank" rel="noopener" class="text-primary-600 underline">PocketBase docs</a>).
          </p>
        </div>

        <div class="space-y-3 border-t border-surface-100 pt-6">
          <h3 class="text-base font-semibold text-surface-900">1. Sign up / email verification</h3>
          <div>
            <label class="mb-1 block text-sm font-medium text-surface-700">Subject</label>
            <input
              v-model="templates.verification.subject"
              type="text"
              class="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-surface-700">Body (HTML)</label>
            <textarea
              v-model="templates.verification.body"
              rows="8"
              class="w-full rounded-lg border border-surface-200 px-3 py-2 font-mono text-xs"
            />
          </div>
        </div>

        <div class="space-y-3 border-t border-surface-100 pt-6">
          <h3 class="text-base font-semibold text-surface-900">2. Password reset</h3>
          <div>
            <label class="mb-1 block text-sm font-medium text-surface-700">Subject</label>
            <input
              v-model="templates.passwordReset.subject"
              type="text"
              class="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-surface-700">Body (HTML)</label>
            <textarea
              v-model="templates.passwordReset.body"
              rows="8"
              class="w-full rounded-lg border border-surface-200 px-3 py-2 font-mono text-xs"
            />
          </div>
        </div>

        <div class="space-y-3 border-t border-surface-100 pt-6">
          <h3 class="text-base font-semibold text-surface-900">3. Email change confirmation</h3>
          <div>
            <label class="mb-1 block text-sm font-medium text-surface-700">Subject</label>
            <input
              v-model="templates.emailChange.subject"
              type="text"
              class="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-surface-700">Body (HTML)</label>
            <textarea
              v-model="templates.emailChange.body"
              rows="8"
              class="w-full rounded-lg border border-surface-200 px-3 py-2 font-mono text-xs"
            />
          </div>
        </div>

        <p v-if="saveError" class="text-sm text-red-600">{{ saveError }}</p>
        <p v-if="saveOk" class="text-sm text-green-600">Templates saved to PocketBase.</p>
        <button
          type="submit"
          :disabled="saving"
          class="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
        >
          {{ saving ? 'Saving…' : 'Save all templates' }}
        </button>
      </form>

      <!-- Test email -->
      <section class="mt-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-surface-900">Send test email</h2>
        <p class="mt-2 text-sm text-surface-500">
          Uses PocketBase’s test send (requires SMTP enabled). Pick which template to preview.
        </p>
        <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div class="min-w-0 flex-1">
            <label class="mb-1 block text-sm font-medium text-surface-700">Destination</label>
            <input v-model="testTo" type="email" class="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm" placeholder="you@agency.com" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-surface-700">Template</label>
            <select v-model="testTemplate" class="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm sm:w-48">
              <option value="verification">Verification</option>
              <option value="password-reset">Password reset</option>
              <option value="email-change">Email change</option>
            </select>
          </div>
          <button
            type="button"
            :disabled="testSending || !testTo.trim()"
            class="rounded-lg border border-primary-600 bg-white px-4 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50 disabled:opacity-50"
            @click="sendTest"
          >
            {{ testSending ? 'Sending…' : 'Send test' }}
          </button>
        </div>
        <p v-if="testError" class="mt-2 text-sm text-red-600">{{ testError }}</p>
        <p v-if="testOk" class="mt-2 text-sm text-green-600">Test email queued/sent.</p>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const pb = usePocketbase()
const { allowed, hint } = useAdminGate()
const saving = ref(false)
const saveError = ref('')
const saveOk = ref(false)
const mailerLoaded = ref(false)
const mailer = reactive({
  smtpEnabled: false,
  smtpHost: '',
  smtpPort: 0,
  appName: '',
  appURL: '',
  senderName: '',
  senderAddress: '',
  settingsWarning: '',
})

const smtpLine = computed(() => {
  if (mailer.smtpEnabled) {
    return `On (${mailer.smtpHost}:${mailer.smtpPort})`
  }
  return 'Off — emails will not send until SMTP is enabled.'
})

const templates = reactive({
  verification: { subject: '', body: '' },
  passwordReset: { subject: '', body: '' },
  emailChange: { subject: '', body: '' },
})

const testTo = ref('')
const testTemplate = ref<'verification' | 'password-reset' | 'email-change'>('verification')
const testSending = ref(false)
const testError = ref('')
const testOk = ref(false)

const pbAdminUrl = computed(() => {
  const config = useRuntimeConfig()
  const base = ((config.public?.pocketbaseUrl as string) || '').replace(/\/+$/, '')
  return base ? `${base}/_/` : 'https://pb.webrankingreports.com/_/'
})

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

watch(
  allowed,
  async (ok) => {
    if (ok !== true) return
    mailerLoaded.value = false
    try {
      const [status, authTpl] = await Promise.all([
        $fetch<typeof mailer>('/api/admin/mailer-status', { headers: authHeaders() }).catch(() => null),
        $fetch<{
          verification: { subject: string; body: string }
          passwordReset: { subject: string; body: string }
          emailChange: { subject: string; body: string }
        }>('/api/admin/auth-email-templates', { headers: authHeaders() }).catch(() => null),
      ])

      if (status) {
        Object.assign(mailer, status)
      }

      if (authTpl) {
        templates.verification = { ...authTpl.verification }
        templates.passwordReset = { ...authTpl.passwordReset }
        templates.emailChange = { ...authTpl.emailChange }
      }
    } catch {
      // partial load
    } finally {
      mailerLoaded.value = true
    }
  },
  { immediate: true },
)

async function saveAll() {
  saveError.value = ''
  saveOk.value = false
  saving.value = true
  try {
    await $fetch('/api/admin/auth-email-templates', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        verification: templates.verification,
        passwordReset: templates.passwordReset,
        emailChange: templates.emailChange,
      },
    })
    saveOk.value = true
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    saveError.value = err?.data?.message ?? err?.message ?? 'Failed to save'
  } finally {
    saving.value = false
  }
}

async function sendTest() {
  testError.value = ''
  testOk.value = false
  testSending.value = true
  try {
    await $fetch('/api/admin/test-auth-email', {
      method: 'POST',
      headers: authHeaders(),
      body: { to: testTo.value.trim(), template: testTemplate.value },
    })
    testOk.value = true
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    testError.value = err?.data?.message ?? err?.message ?? 'Failed to send'
  } finally {
    testSending.value = false
  }
}
</script>
