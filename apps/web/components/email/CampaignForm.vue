<template>
  <form class="space-y-6" @submit.prevent="onSubmit('draft')">
    <EmailCampaignTemplatePicker
      :initial-template-id="initialTemplateId"
      @apply="applyStarterTemplate"
    />

    <p
      v-if="loadedFromCampaignName"
      class="rounded-lg border border-primary-200 bg-primary-50/80 px-3 py-2 text-xs text-surface-800"
    >
      Draft copied from &ldquo;{{ loadedFromCampaignName }}&rdquo; — audience is not copied; choose recipients below.
    </p>

    <div>
      <label class="block text-sm font-medium text-surface-700">Campaign name</label>
      <input
        v-model="name"
        type="text"
        required
        class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
        placeholder="Spring check-in"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-surface-700">Subject</label>
      <input
        v-model="subject"
        type="text"
        required
        class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
        placeholder="A quick update from us"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-surface-700">Email body (HTML)</label>
      <p class="mt-0.5 text-xs text-surface-500">
        Use basic HTML. Merge fields:
        <code class="rounded bg-surface-100 px-1">{{ mergeTagFirstName }}</code>,
        <code class="rounded bg-surface-100 px-1">{{ mergeTagEmail }}</code>
      </p>
      <textarea
        v-model="bodyHtml"
        required
        rows="12"
        class="mt-2 w-full rounded-lg border border-surface-300 px-3 py-2 font-mono text-sm"
        :placeholder="bodyPlaceholder"
      />
      <p v-if="campaignFooterPreview" class="mt-2 text-xs text-surface-500">
        On send, your
        <NuxtLink to="/agency?tab=email" class="font-medium text-primary-600 hover:underline">agency campaign footer</NuxtLink>
        is appended below this body.
      </p>
    </div>

    <EmailCampaignAiPanel v-model:campaign-name="name" v-model:subject="subject" v-model:body-html="bodyHtml" />

    <div class="rounded-xl border border-surface-200 bg-surface-50/80 p-4">
      <h3 class="text-sm font-semibold text-surface-900">Send test email</h3>
      <p class="mt-1 text-xs text-surface-500">
        Sends one message with your subject and HTML (prefix <code class="rounded bg-surface-100 px-1">[Test]</code>). Uses
        <NuxtLink to="/agency?tab=email" class="font-medium text-primary-600 hover:underline">Agency → Email Sending</NuxtLink>
        when Google is connected. No campaign is saved and CRM contacts are not emailed.
      </p>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-surface-700">Send to</label>
          <input
            v-model="testTo"
            type="email"
            class="mt-1 w-full max-w-md rounded-lg border border-surface-300 px-3 py-2 text-sm"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Preview first name ({{ mergeTagFirstName }})</label>
          <input v-model="testFirstName" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" placeholder="Test" />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Preview email ({{ mergeTagEmail }})</label>
          <input v-model="testPreviewEmail" type="email" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" :placeholder="testTo || 'same as Send to'" />
        </div>
      </div>
      <p v-if="testMessage" class="mt-3 text-sm" :class="testOk ? 'text-green-700' : 'text-red-600'">{{ testMessage }}</p>
      <button
        type="button"
        class="mt-3 rounded-lg border border-surface-300 bg-white px-4 py-2 text-sm font-semibold text-surface-800 hover:bg-surface-50 disabled:opacity-50"
        :disabled="testBusy || !subject.trim() || !bodyHtml.trim() || !testTo.trim()"
        @click="sendTestEmail"
      >
        {{ testBusy ? 'Sending…' : 'Send test email' }}
      </button>
    </div>

    <div class="rounded-xl border border-surface-200 bg-surface-50/80 p-4">
      <h3 class="text-sm font-semibold text-surface-900">Recipients</h3>
      <p class="mt-1 text-xs text-surface-500">
        Only people in your CRM with an email address are included.
        <NuxtLink to="/crm/clients" class="font-medium text-primary-600 hover:underline">Manage contacts &amp; leads</NuxtLink>
        in CRM.
      </p>
      <div class="mt-3 space-y-3">
        <label class="flex items-center gap-2 text-sm text-surface-800">
          <input v-model="recipientMode" type="radio" value="all" class="text-primary-600" />
          All contacts
        </label>
        <label class="flex items-center gap-2 text-sm text-surface-800">
          <input v-model="recipientMode" type="radio" value="site" class="text-primary-600" />
          Filter by site
        </label>
        <select
          v-if="recipientMode === 'site'"
          v-model="siteId"
          class="ml-6 w-full max-w-md rounded-lg border border-surface-300 px-3 py-2 text-sm"
        >
          <option value="">Select a site…</option>
          <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }} ({{ s.domain }})</option>
        </select>
        <label class="flex items-center gap-2 text-sm text-surface-800">
          <input v-model="recipientMode" type="radio" value="tag" class="text-primary-600" />
          Filter by tag (exact match)
        </label>
        <input
          v-if="recipientMode === 'tag'"
          v-model="tag"
          type="text"
          class="ml-6 w-full max-w-md rounded-lg border border-surface-300 px-3 py-2 text-sm"
          placeholder="newsletter"
        />
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <div class="flex flex-wrap gap-3">
      <button
        type="submit"
        :disabled="busy"
        class="rounded-lg border border-surface-300 bg-white px-4 py-2 text-sm font-semibold text-surface-800 hover:bg-surface-50 disabled:opacity-50"
      >
        Save draft
      </button>
      <button
        type="button"
        :disabled="busy"
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
        @click="onSubmit('send_now')"
      >
        Send now
      </button>
      <button
        type="button"
        :disabled="busy"
        class="rounded-lg bg-surface-800 px-4 py-2 text-sm font-semibold text-white hover:bg-surface-700 disabled:opacity-50"
        @click="openSchedule"
      >
        Schedule…
      </button>
    </div>

    <div v-if="scheduleOpen" class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
      <p class="text-sm font-medium text-surface-900">Schedule send</p>
      <input v-model="sendAtLocal" type="datetime-local" class="mt-2 rounded-lg border border-surface-300 px-3 py-2 text-sm" />
      <div class="mt-3 flex gap-2">
        <button
          type="button"
          :disabled="busy"
          class="rounded-lg bg-surface-800 px-4 py-2 text-sm font-semibold text-white hover:bg-surface-700 disabled:opacity-50"
          @click="onSubmit('schedule')"
        >
          Confirm schedule
        </button>
        <button type="button" class="text-sm text-surface-600 hover:text-surface-900" @click="scheduleOpen = false">Cancel</button>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { Site } from '~/types'
import type { EmailCampaignStarterTemplate } from '~/utils/emailCampaignStarterTemplates'

const props = defineProps<{
  sites: Site[]
  initialTemplateId?: string
  initialDraft?: {
    name?: string
    subject?: string
    bodyHtml?: string
    loadedFromCampaignName?: string
  }
}>()

const emit = defineEmits<{
  created: []
}>()

const name = ref(props.initialDraft?.name ?? '')
const subject = ref(props.initialDraft?.subject ?? '')
const bodyHtml = ref(
  props.initialDraft?.bodyHtml ??
    '<p>Hi {{first_name}},</p>\n<p>Thanks for being a contact.</p>\n<p>— The team</p>',
)
const loadedFromCampaignName = ref(props.initialDraft?.loadedFromCampaignName ?? '')
const campaignFooterPreview = ref(false)
const recipientMode = ref<'all' | 'site' | 'tag'>('all')
const siteId = ref('')
const tag = ref('')
const sendAtLocal = ref('')
const scheduleOpen = ref(false)
const busy = ref(false)
const error = ref('')
const testTo = ref('')
const testFirstName = ref('Test')
const testPreviewEmail = ref('')
const testBusy = ref(false)
const testMessage = ref('')
const testOk = ref(false)

const bodyPlaceholder = '<p>Hi {{first_name}},</p>'
const mergeTagFirstName = '{{first_name}}'
const mergeTagEmail = '{{email}}'

const pb = usePocketbase()

function applyStarterTemplate(t: EmailCampaignStarterTemplate) {
  name.value = t.campaignName
  subject.value = t.subject
  bodyHtml.value = t.bodyHtml
  recipientMode.value = t.recipientMode
  if (t.recipientMode === 'tag' && t.tag) tag.value = t.tag
  if (t.recipientMode === 'site') siteId.value = ''
  loadedFromCampaignName.value = ''
}

onMounted(() => {
  if (testTo.value.trim()) return
  const model = pb.authStore.model as { name?: string; email?: string } | null
  const email = typeof model?.email === 'string' ? model.email.trim() : ''
  if (email) testTo.value = email
  const first = (model?.name ?? '').trim().split(/\s+/)[0]
  if (first) testFirstName.value = first

  void $fetch<{ campaignFooterHtml: string }>('/api/email-campaigns/footer-preview', { headers: authHeaders() })
    .then((res) => {
      campaignFooterPreview.value = Boolean(res.campaignFooterHtml?.trim())
    })
    .catch(() => {
      campaignFooterPreview.value = false
    })
})

async function sendTestEmail() {
  testMessage.value = ''
  testOk.value = false
  if (!subject.value.trim() || !bodyHtml.value.trim()) {
    testMessage.value = 'Enter a subject and body first.'
    return
  }
  if (!testTo.value.trim()) {
    testMessage.value = 'Enter a test recipient email.'
    return
  }
  testBusy.value = true
  try {
    const res = await $fetch<{ ok: boolean; to: string; subject: string; provider: string; senderEmail: string | null }>(
      '/api/email-campaigns/test',
      {
        method: 'POST',
        headers: authHeaders(),
        body: {
          to: testTo.value.trim(),
          subject: subject.value,
          bodyHtml: bodyHtml.value,
          previewFirstName: testFirstName.value,
          previewEmail: testPreviewEmail.value.trim() || testTo.value.trim(),
        },
      },
    )
    testOk.value = true
    const from =
      res.provider === 'google' && res.senderEmail
        ? ` from ${res.senderEmail}`
        : res.provider === 'system'
          ? ' via platform mail'
          : ''
    testMessage.value = `Test sent to ${res.to}${from}. Check your inbox (subject: ${res.subject}).`
  } catch (e: unknown) {
    const fe = e as { data?: { message?: string }; message?: string }
    testMessage.value = fe?.data?.message || fe?.message || 'Test send failed.'
  } finally {
    testBusy.value = false
  }
}

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function localToIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function openSchedule() {
  scheduleOpen.value = true
  if (!sendAtLocal.value) {
    const d = new Date()
    d.setHours(d.getHours() + 1)
    d.setMinutes(0, 0, 0)
    const pad = (n: number) => String(n).padStart(2, '0')
    sendAtLocal.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
}

async function onSubmit(action: 'draft' | 'send_now' | 'schedule') {
  error.value = ''
  if (recipientMode.value === 'site' && !siteId.value) {
    error.value = 'Choose a site for the filtered audience.'
    return
  }
  if (recipientMode.value === 'tag' && !tag.value.trim()) {
    error.value = 'Enter a tag to filter by.'
    return
  }
  const sendAt = action === 'schedule' ? localToIso(sendAtLocal.value) : undefined
  if (action === 'schedule' && !sendAt) {
    error.value = 'Pick a valid future date and time.'
    return
  }
  if (action === 'schedule' && sendAt) {
    const t = new Date(sendAt).getTime()
    if (Number.isNaN(t) || t <= Date.now()) {
      error.value = 'Schedule time must be in the future.'
      return
    }
  }
  busy.value = true
  try {
    await $fetch('/api/email-campaigns', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        name: name.value,
        subject: subject.value,
        bodyHtml: bodyHtml.value,
        recipientMode: recipientMode.value,
        siteId: recipientMode.value === 'site' ? siteId.value : undefined,
        tag: recipientMode.value === 'tag' ? tag.value.trim() : undefined,
        action,
        sendAt,
      },
    })
    scheduleOpen.value = false
    emit('created')
  } catch (e: unknown) {
    const fe = e as { data?: { message?: string }; message?: string }
    const msg = fe?.data?.message || fe?.message
    error.value = msg || (e instanceof Error ? e.message : 'Could not save campaign')
  } finally {
    busy.value = false
  }
}
</script>
