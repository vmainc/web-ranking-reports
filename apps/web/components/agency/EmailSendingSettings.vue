<template>
  <section class="mb-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
    <h2 class="text-lg font-semibold text-surface-900">Email Sending</h2>
    <p class="mt-2 text-sm text-surface-500">
      Choose how report emails are sent. When you connect Google, scheduled and manual reports are sent through that
      account — not by spoofing a From address on the platform mailbox.
    </p>

    <p v-if="!isOwner && workspaceRole !== null" class="mt-4 text-sm text-surface-500">
      Only the workspace owner can manage email sending settings.
    </p>

    <div v-else-if="loading" class="mt-4 text-sm text-surface-500">Loading…</div>

    <div v-else-if="settings" class="mt-6 space-y-6">
      <p
        v-if="banner"
        class="rounded-lg border px-4 py-3 text-sm"
        :class="banner.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'"
      >
        {{ banner.text }}
      </p>

      <p
        v-if="settings.connectionStatus === 'reconnect_required'"
        class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        Google reconnection is required before reports can be sent with your connected account.
        {{ settings.lastSendError ? ` (${settings.lastSendError})` : '' }}
      </p>

      <div>
        <h3 class="text-sm font-semibold text-surface-900">Delivery method</h3>
        <div class="mt-3 space-y-2">
          <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-surface-200 p-3 hover:bg-surface-50">
            <input
              v-model="deliveryMethod"
              type="radio"
              value="system"
              class="mt-1"
              :disabled="saving"
              @change="saveDeliveryMethod"
            />
            <span>
              <span class="block text-sm font-medium text-surface-900">Web Ranking Reports Email</span>
              <span class="mt-0.5 block text-xs text-surface-500">Default platform sender (current system mailbox).</span>
            </span>
          </label>
          <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-surface-200 p-3 hover:bg-surface-50">
            <input
              v-model="deliveryMethod"
              type="radio"
              value="google"
              class="mt-1"
              :disabled="saving || !canSelectGoogle"
              @change="saveDeliveryMethod"
            />
            <span>
              <span class="block text-sm font-medium text-surface-900">Connected Google Account</span>
              <span class="mt-0.5 block text-xs text-surface-500">
                Send through Gmail using OAuth. The From address is always the authenticated Google email.
              </span>
            </span>
          </label>
        </div>
        <p v-if="!settings.googleConfigured || !settings.encryptionConfigured" class="mt-2 text-xs text-amber-700">
          Server configuration incomplete
          <template v-if="!settings.googleConfigured"> (Google OAuth env vars)</template>
          <template v-if="!settings.encryptionConfigured"> (encryption key)</template>.
        </p>
      </div>

      <div class="rounded-lg border border-surface-200 p-4">
        <h3 class="text-sm font-semibold text-surface-900">Google connection</h3>
        <dl class="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt class="text-surface-500">Status</dt>
            <dd class="font-medium text-surface-900">{{ statusLabel }}</dd>
          </div>
          <div>
            <dt class="text-surface-500">Connected email</dt>
            <dd class="font-medium text-surface-900">{{ settings.senderEmail || '—' }}</dd>
          </div>
          <div>
            <dt class="text-surface-500">Last connected / refresh</dt>
            <dd class="font-medium text-surface-900">{{ formatWhen(settings.lastTokenRefreshAt || settings.lastConnectedAt) }}</dd>
          </div>
          <div>
            <dt class="text-surface-500">Last successful send</dt>
            <dd class="font-medium text-surface-900">{{ formatWhen(settings.lastSuccessfulSendAt) }}</dd>
          </div>
        </dl>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-if="settings.connectionStatus === 'disconnected'"
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="connecting || !settings.googleConfigured || !settings.encryptionConfigured"
            @click="connectGoogle(false)"
          >
            {{ connecting ? 'Redirecting…' : 'Connect Google Account' }}
          </button>
          <template v-else>
            <button
              type="button"
              class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
              :disabled="connecting"
              @click="connectGoogle(true)"
            >
              {{ connecting ? 'Redirecting…' : 'Reconnect' }}
            </button>
            <button
              type="button"
              class="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              :disabled="disconnecting"
              @click="confirmDisconnect = true"
            >
              Disconnect
            </button>
          </template>
          <button
            type="button"
            class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
            :disabled="testing || !canTest"
            @click="sendTest"
          >
            {{ testing ? 'Sending…' : 'Send Test Email' }}
          </button>
        </div>
        <p v-if="testHint" class="mt-2 text-sm text-surface-600">{{ testHint }}</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-surface-700">Sender display name</label>
          <input
            v-model="senderName"
            type="text"
            maxlength="120"
            class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
            placeholder="Your agency name"
            @blur="saveTemplates"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-surface-700">Reply-to email</label>
          <input
            v-model="replyToEmail"
            type="email"
            maxlength="320"
            class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
            placeholder="optional@youragency.com"
            @blur="saveTemplates"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-surface-700">Default email subject template</label>
          <input
            v-model="defaultSubjectTemplate"
            type="text"
            maxlength="500"
            class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
            placeholder="Report for {{site}}"
            @blur="saveTemplates"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-surface-700">Default email message template</label>
          <textarea
            v-model="defaultMessageTemplate"
            rows="4"
            maxlength="5000"
            class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
            placeholder="Optional HTML or plain text body template"
            @blur="saveTemplates"
          />
        </div>
      </div>
      <p v-if="saveError" class="text-sm text-red-600">{{ saveError }}</p>
    </div>

    <Teleport to="body">
      <div
        v-if="confirmDisconnect"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="confirmDisconnect = false"
      >
        <div class="w-full max-w-sm rounded-xl border border-surface-200 bg-white p-6 shadow-2xl">
          <h3 class="text-lg font-semibold text-surface-900">Disconnect Google?</h3>
          <p class="mt-2 text-sm text-surface-600">
            Report delivery will switch back to Web Ranking Reports Email. Scheduled reports will no longer send from
            your Google account until you reconnect.
          </p>
          <div class="mt-4 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
              @click="confirmDisconnect = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
              :disabled="disconnecting"
              @click="disconnectGoogle"
            >
              {{ disconnecting ? 'Disconnecting…' : 'Disconnect' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
type Settings = {
  deliveryMethod: 'system' | 'google'
  connectionStatus: string
  senderEmail: string | null
  senderName: string
  replyToEmail: string
  defaultSubjectTemplate: string
  defaultMessageTemplate: string
  lastConnectedAt: string | null
  lastTokenRefreshAt: string | null
  lastSuccessfulSendAt: string | null
  lastSendError: string | null
  lastTestAt: string | null
  lastTestStatus: string | null
  googleConfigured: boolean
  encryptionConfigured: boolean
}

const props = defineProps<{
  isOwner: boolean
  workspaceRole: string | null
  authHeaders: () => Record<string, string>
}>()

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const settings = ref<Settings | null>(null)
const deliveryMethod = ref<'system' | 'google'>('system')
const senderName = ref('')
const replyToEmail = ref('')
const defaultSubjectTemplate = ref('')
const defaultMessageTemplate = ref('')
const saving = ref(false)
const connecting = ref(false)
const disconnecting = ref(false)
const testing = ref(false)
const confirmDisconnect = ref(false)
const saveError = ref('')
const testHint = ref('')
const banner = ref<{ ok: boolean; text: string } | null>(null)

const canSelectGoogle = computed(() => {
  const s = settings.value
  if (!s?.googleConfigured || !s.encryptionConfigured) return false
  if (!s.senderEmail || s.connectionStatus === 'disconnected') return false
  if (s.connectionStatus === 'reconnect_required') return false
  return true
})

const canTest = computed(() => {
  const s = settings.value
  if (!s) return false
  if (s.deliveryMethod === 'system') return true
  return s.connectionStatus === 'connected' && Boolean(s.senderEmail)
})

const statusLabel = computed(() => {
  const c = settings.value?.connectionStatus
  if (c === 'connected') return 'Connected'
  if (c === 'reconnect_required') return 'Reconnect required'
  if (c === 'error') return 'Error'
  return 'Disconnected'
})

function formatWhen(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function applySettings(s: Settings) {
  settings.value = s
  deliveryMethod.value = s.deliveryMethod
  senderName.value = s.senderName
  replyToEmail.value = s.replyToEmail
  defaultSubjectTemplate.value = s.defaultSubjectTemplate
  defaultMessageTemplate.value = s.defaultMessageTemplate
}

async function load() {
  if (!props.isOwner) {
    loading.value = false
    return
  }
  loading.value = true
  saveError.value = ''
  try {
    const res = await $fetch<{ settings: Settings }>('/api/agency/email-sending', {
      headers: props.authHeaders(),
    })
    applySettings(res.settings)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    saveError.value = err.data?.message || err.message || 'Could not load email settings.'
  } finally {
    loading.value = false
  }
}

function consumeQueryBanner() {
  const q = String(route.query.emailSending || '')
  if (!q) return
  const map: Record<string, { ok: boolean; text: string }> = {
    connected: { ok: true, text: 'Google account connected. Reports can now send through that mailbox.' },
    denied: { ok: false, text: 'Google authorization was denied.' },
    state_expired: { ok: false, text: 'Google connection link expired. Try Connect again.' },
    state_invalid: { ok: false, text: 'Google connection state was invalid. Try Connect again.' },
    missing_refresh: {
      ok: false,
      text: 'Google did not return a refresh token. Click Reconnect and make sure you approve access (consent screen).',
    },
    no_email: { ok: false, text: 'Google did not return an email address for the account.' },
    config: { ok: false, text: 'Google email OAuth is not configured on this server.' },
    forbidden: { ok: false, text: 'Only the workspace owner can connect Google for email sending.' },
    token: {
      ok: false,
      text:
        'Google rejected the login (token exchange failed). Usually the client secret does not match Google Cloud, or the Email Sending redirect URI is missing. Update infra/.env GOOGLE_CLIENT_SECRET (or Admin → Integrations), ensure redirect URI https://webrankingreports.com/api/agency/email-sending/google/callback is on the OAuth client, recreate web, then try Connect again.',
    },
    db: {
      ok: false,
      text:
        'Email Sending database tables are missing. On the server run: node apps/web/scripts/add-agency-email-integrations.mjs then try Connect again.',
    },
    encrypt: {
      ok: false,
      text: 'Could not encrypt Google tokens. Set EMAIL_CREDENTIALS_ENCRYPTION_KEY or ensure STATE_SIGNING_SECRET is set, then recreate web.',
    },
    userinfo: { ok: false, text: 'Connected to Google but could not read the account email. Try again.' },
    error: { ok: false, text: 'Could not complete Google connection. Try again.' },
  }
  banner.value = map[q] || { ok: false, text: 'Google connection did not complete.' }
  const next = { ...route.query }
  delete next.emailSending
  void router.replace({ query: next })
}

async function saveDeliveryMethod() {
  if (!settings.value) return
  saving.value = true
  saveError.value = ''
  try {
    const res = await $fetch<{ settings: Settings }>('/api/agency/email-sending', {
      method: 'PATCH',
      headers: props.authHeaders(),
      body: { deliveryMethod: deliveryMethod.value },
    })
    applySettings(res.settings)
  } catch (e: unknown) {
    deliveryMethod.value = settings.value.deliveryMethod
    const err = e as { data?: { message?: string }; message?: string }
    saveError.value = err.data?.message || err.message || 'Could not update delivery method.'
  } finally {
    saving.value = false
  }
}

async function saveTemplates() {
  if (!settings.value) return
  saving.value = true
  saveError.value = ''
  try {
    const res = await $fetch<{ settings: Settings }>('/api/agency/email-sending', {
      method: 'PATCH',
      headers: props.authHeaders(),
      body: {
        senderName: senderName.value,
        replyToEmail: replyToEmail.value,
        defaultSubjectTemplate: defaultSubjectTemplate.value,
        defaultMessageTemplate: defaultMessageTemplate.value,
      },
    })
    applySettings(res.settings)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    saveError.value = err.data?.message || err.message || 'Could not save settings.'
  } finally {
    saving.value = false
  }
}

async function connectGoogle(forceConsent: boolean) {
  connecting.value = true
  saveError.value = ''
  try {
    const res = await $fetch<{ url: string }>('/api/agency/email-sending/google/connect', {
      headers: props.authHeaders(),
      query: { returnPath: '/agency?tab=email', ...(forceConsent ? { forceConsent: '1' } : {}) },
    })
    if (res.url) {
      window.location.href = res.url
      return
    }
    saveError.value = 'Could not start Google connection.'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    saveError.value = err.data?.message || err.message || 'Could not start Google connection.'
  } finally {
    connecting.value = false
  }
}

async function disconnectGoogle() {
  disconnecting.value = true
  saveError.value = ''
  try {
    const res = await $fetch<{ settings: Settings }>('/api/agency/email-sending/google/disconnect', {
      method: 'POST',
      headers: props.authHeaders(),
    })
    applySettings(res.settings)
    confirmDisconnect.value = false
    banner.value = { ok: true, text: 'Google account disconnected. Delivery method set to Web Ranking Reports Email.' }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    saveError.value = err.data?.message || err.message || 'Could not disconnect.'
  } finally {
    disconnecting.value = false
  }
}

async function sendTest() {
  testing.value = true
  testHint.value = ''
  saveError.value = ''
  try {
    const res = await $fetch<{
      ok: boolean
      result: { provider: string; senderEmail: string }
      settings: Settings
    }>('/api/agency/email-sending/test', {
      method: 'POST',
      headers: props.authHeaders(),
      body: {},
    })
    applySettings(res.settings)
    testHint.value = `Test sent via ${res.result.provider} from ${res.result.senderEmail}.`
    banner.value = { ok: true, text: 'Test email sent successfully.' }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    testHint.value = err.data?.message || err.message || 'Test email failed.'
    banner.value = { ok: false, text: testHint.value }
    await load()
  } finally {
    testing.value = false
  }
}

onMounted(async () => {
  consumeQueryBanner()
  await load()
})

watch(
  () => props.isOwner,
  () => {
    void load()
  },
)
</script>
