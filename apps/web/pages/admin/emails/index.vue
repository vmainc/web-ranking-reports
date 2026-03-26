<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <NuxtLink
      to="/dashboard"
      class="mb-6 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
    >
      ← Dashboard
    </NuxtLink>
    <h1 class="mb-2 text-2xl font-semibold text-surface-900">Admin – Emails</h1>
    <p class="mb-6 max-w-3xl text-sm text-surface-500">
      Manage SMTP in PocketBase, then edit templates below. <strong>PocketBase auth</strong> templates are sent by PocketBase;
      <strong>App</strong> templates are stored here and used when you wire invites, site access, reports, and lead notifications in the app.
      Only <strong>admin@vma.agency</strong> (and configured admin emails) can access this page.
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
      <!-- SMTP -->
      <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-surface-900">SMTP &amp; sender (PocketBase)</h2>
        <p class="mt-2 text-sm text-surface-500">
          Configure the mail server in PocketBase Admin →
          <a :href="pbAdminUrl" target="_blank" rel="noopener" class="text-primary-600 underline">Settings → Mailer</a>.
        </p>
        <p v-if="mailer.settingsWarning" class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Could not read mail settings from PocketBase API: {{ mailer.settingsWarning }}
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

      <!-- Template table -->
      <section class="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
        <div class="border-b border-surface-100 bg-surface-50 px-4 py-3">
          <h2 class="text-lg font-semibold text-surface-900">Email templates</h2>
          <p class="mt-1 text-sm text-surface-500">Click a row to edit subject and HTML body.</p>
        </div>

        <div v-if="!manifestLoaded" class="p-8 text-center text-sm text-surface-500">Loading templates…</div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-surface-200 text-left text-sm">
            <thead class="bg-surface-50 text-xs font-semibold uppercase tracking-wide text-surface-600">
              <tr>
                <th class="px-4 py-3">Name</th>
                <th class="hidden px-4 py-3 sm:table-cell">Category</th>
                <th class="hidden px-4 py-3 md:table-cell">Description</th>
                <th class="px-4 py-3 text-right"> </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-100">
              <tr
                v-for="row in catalogRows"
                :key="row.id"
                class="cursor-pointer hover:bg-primary-50/40"
                @click="openEditor(row.id)"
              >
                <td class="px-4 py-3 font-medium text-surface-900">{{ row.name }}</td>
                <td class="hidden px-4 py-3 sm:table-cell">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="
                      row.source === 'pocketbase_auth'
                        ? 'bg-violet-100 text-violet-900'
                        : 'bg-teal-100 text-teal-900'
                    "
                  >
                    {{ row.source === 'pocketbase_auth' ? 'PocketBase auth' : 'App' }}
                  </span>
                </td>
                <td class="hidden max-w-md px-4 py-3 text-surface-600 md:table-cell">{{ row.description }}</td>
                <td class="px-4 py-3 text-right text-primary-600">Edit →</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Test email (PocketBase auth only) -->
      <section class="mt-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-surface-900">Send test email (PocketBase auth)</h2>
        <p class="mt-2 text-sm text-surface-500">
          Uses PocketBase’s test send (requires SMTP). App templates are tested when you trigger the real flows.
        </p>
        <p class="mt-2 rounded-lg border border-surface-100 bg-surface-50 px-3 py-2 text-xs text-surface-600">
          If this returns <strong>502</strong> or <strong>exit status 1</strong>, PocketBase’s mailer failed (not this page). Set
          <strong>Settings → Mailer</strong> in
          <a :href="pbAdminUrl" target="_blank" rel="noopener" class="font-medium text-primary-600 underline">PocketBase admin</a>
          and ensure the <strong>PocketBase</strong> host/container can reach your SMTP (firewall, correct port/TLS, app password).
          A browser console line about <strong>SES / lockdown-install</strong> is usually a wallet extension and unrelated.
        </p>
        <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div class="min-w-0 flex-1">
            <label class="mb-1 block text-sm font-medium text-surface-700">Destination</label>
            <input v-model="testTo" type="email" class="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm" placeholder="you@agency.com" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-surface-700">Template</label>
            <select v-model="testTemplate" class="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm sm:w-56">
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

    <!-- Editor modal -->
    <Teleport to="body">
      <div
        v-if="editorOpen && activeDef"
        class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
      >
        <div class="absolute inset-0 bg-surface-900/50" @click="closeEditor" />
        <div
          class="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-2xl border border-surface-200 bg-white shadow-xl sm:rounded-2xl"
          @click.stop
        >
          <div class="flex shrink-0 items-start justify-between gap-3 border-b border-surface-100 px-5 py-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-surface-500">
                {{ activeDef.source === 'pocketbase_auth' ? 'PocketBase auth' : 'App template' }}
              </p>
              <h3 class="text-lg font-semibold text-surface-900">{{ activeDef.name }}</h3>
              <p class="mt-1 text-sm text-surface-600">{{ activeDef.description }}</p>
            </div>
            <button
              type="button"
              class="rounded-lg p-2 text-surface-500 hover:bg-surface-100 hover:text-surface-800"
              aria-label="Close"
              @click="closeEditor"
            >
              ✕
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <p class="mb-3 text-xs text-surface-500">
              Placeholders:
              <code
                v-for="ph in activeDef.placeholders"
                :key="ph"
                class="mr-1 mt-1 inline-block rounded bg-surface-100 px-1 py-0.5 font-mono text-[11px]"
              >{{ ph }}</code>
            </p>
            <div class="space-y-3">
              <div>
                <label class="mb-1 block text-sm font-medium text-surface-700">Subject</label>
                <input
                  v-model="draft.subject"
                  type="text"
                  class="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-surface-700">Body (HTML)</label>
                <textarea
                  v-model="draft.body"
                  rows="14"
                  class="w-full rounded-lg border border-surface-200 px-3 py-2 font-mono text-xs leading-relaxed"
                />
              </div>
            </div>
            <p v-if="saveError" class="mt-3 text-sm text-red-600">{{ saveError }}</p>
            <p v-if="saveOk" class="mt-3 text-sm text-green-600">Saved.</p>
          </div>

          <div class="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-surface-100 px-5 py-4">
            <button
              type="button"
              class="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
              @click="closeEditor"
            >
              Cancel
            </button>
            <button
              v-if="authTestKey"
              type="button"
              :disabled="testSending || !testTo.trim()"
              class="rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-100 disabled:opacity-50"
              @click="sendTestFromModal"
            >
              {{ testSending ? 'Sending…' : 'Send PocketBase test' }}
            </button>
            <button
              type="button"
              :disabled="saving"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
              @click="saveEditor"
            >
              {{ saving ? 'Saving…' : 'Save template' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { EmailTemplateDefinition } from '~/server/utils/emailTemplateCatalog'

definePageMeta({ layout: 'default' })

const pb = usePocketbase()
const { allowed, hint } = useAdminGate()

const mailerLoaded = ref(false)
const manifestLoaded = ref(false)
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

const catalogRows = ref<EmailTemplateDefinition[]>([])
const authPayload = ref({
  verification: { subject: '', body: '' },
  passwordReset: { subject: '', body: '' },
  emailChange: { subject: '', body: '' },
})
const transactionalPayload = ref<Record<string, { subject: string; body: string }>>({})

const editorOpen = ref(false)
const activeId = ref<string | null>(null)
const draft = reactive({ subject: '', body: '' })
const saving = ref(false)
const saveError = ref('')
const saveOk = ref(false)

const testTo = ref('')
const testTemplate = ref<'verification' | 'password-reset' | 'email-change'>('verification')
const testSending = ref(false)
const testError = ref('')
const testOk = ref(false)

const activeDef = computed(() => catalogRows.value.find((r) => r.id === activeId.value) ?? null)

/** Map editor id → PocketBase testEmail template name */
const authTestKey = computed(() => {
  const id = activeId.value
  if (id === 'verification') return 'verification' as const
  if (id === 'passwordReset') return 'password-reset' as const
  if (id === 'emailChange') return 'email-change' as const
  return null
})

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

function loadDraftForId(id: string) {
  const def = catalogRows.value.find((r) => r.id === id)
  if (!def) return
  if (def.source === 'pocketbase_auth') {
    const a = authPayload.value
    if (id === 'verification') Object.assign(draft, a.verification)
    else if (id === 'passwordReset') Object.assign(draft, a.passwordReset)
    else if (id === 'emailChange') Object.assign(draft, a.emailChange)
  } else {
    const t = transactionalPayload.value[id]
    if (t) Object.assign(draft, t)
    else Object.assign(draft, { subject: '', body: '' })
  }
}

function openEditor(id: string) {
  activeId.value = id
  saveError.value = ''
  saveOk.value = false
  loadDraftForId(id)
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
  activeId.value = null
}

async function refreshManifest() {
  manifestLoaded.value = false
  try {
    const res = await $fetch<{
      catalog: EmailTemplateDefinition[]
      auth: typeof authPayload.value
      transactional: Record<string, { subject: string; body: string }>
    }>('/api/admin/email-templates-manifest', { headers: authHeaders() })
    catalogRows.value = res.catalog ?? []
    authPayload.value = {
      verification: { ...res.auth.verification },
      passwordReset: { ...res.auth.passwordReset },
      emailChange: { ...res.auth.emailChange },
    }
    transactionalPayload.value = { ...res.transactional }
  } catch {
    catalogRows.value = []
  } finally {
    manifestLoaded.value = true
  }
}

watch(
  allowed,
  async (ok) => {
    if (ok !== true) return
    mailerLoaded.value = false
    try {
      const [status] = await Promise.all([
        $fetch<typeof mailer>('/api/admin/mailer-status', { headers: authHeaders() }).catch(() => null),
        refreshManifest(),
      ])
      if (status) Object.assign(mailer, status)
    } finally {
      mailerLoaded.value = true
    }
  },
  { immediate: true },
)

async function saveEditor() {
  const id = activeId.value
  const def = activeDef.value
  if (!id || !def) return
  saveError.value = ''
  saveOk.value = false
  saving.value = true
  try {
    if (def.source === 'pocketbase_auth') {
      const body: Record<string, { subject: string; body: string }> = {}
      if (id === 'verification') body.verification = { ...draft }
      if (id === 'passwordReset') body.passwordReset = { ...draft }
      if (id === 'emailChange') body.emailChange = { ...draft }
      await $fetch('/api/admin/auth-email-templates', {
        method: 'POST',
        headers: authHeaders(),
        body,
      })
      if (id === 'verification') authPayload.value.verification = { ...draft }
      if (id === 'passwordReset') authPayload.value.passwordReset = { ...draft }
      if (id === 'emailChange') authPayload.value.emailChange = { ...draft }
    } else {
      await $fetch('/api/admin/transactional-email-templates', {
        method: 'POST',
        headers: authHeaders(),
        body: { id, subject: draft.subject, body: draft.body },
      })
      transactionalPayload.value[id] = { ...draft }
    }
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

watchEffect((onCleanup) => {
  if (!import.meta.client || !editorOpen.value) return
  const h = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeEditor()
  }
  window.addEventListener('keydown', h)
  onCleanup(() => window.removeEventListener('keydown', h))
})

async function sendTestFromModal() {
  const key = authTestKey.value
  if (!key) return
  testError.value = ''
  testOk.value = false
  testSending.value = true
  try {
    await $fetch('/api/admin/test-auth-email', {
      method: 'POST',
      headers: authHeaders(),
      body: { to: testTo.value.trim(), template: key },
    })
    testOk.value = true
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    saveError.value = err?.data?.message ?? err?.message ?? 'Failed to send test'
  } finally {
    testSending.value = false
  }
}
</script>
