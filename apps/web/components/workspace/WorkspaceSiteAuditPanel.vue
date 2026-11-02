<template>
  <div>
    <div class="mb-6">
      <h2 class="text-lg font-semibold text-white">Site audit</h2>
      <p class="mt-1 max-w-3xl text-sm text-slate-400">
        Run a one-off website audit (same engine as your public audit form). Results appear below — open a report for the full
        PageSpeed matrix, SEO signals, and talking points.
      </p>
      <p class="mt-2 text-xs text-slate-500">
        Embed settings and inbound leads from your site live under
        <NuxtLink to="/crm/website-audit" class="font-medium text-blue-400 hover:text-blue-300">CRM → Website audit</NuxtLink>.
      </p>
    </div>

    <section class="mb-8 rounded-xl border border-slate-700/70 bg-slate-900/50 p-5 shadow-sm sm:p-6">
      <form class="space-y-4" @submit.prevent="submitAudit">
        <div>
          <label for="ws-audit-website" class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Website URL *
          </label>
          <input
            id="ws-audit-website"
            v-model="form.website"
            type="url"
            required
            class="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="https://example.com"
          />
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="ws-audit-name" class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Contact name
            </label>
            <input
              id="ws-audit-name"
              v-model="form.name"
              type="text"
              class="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="Optional"
            />
          </div>
          <div>
            <label for="ws-audit-email" class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Email
            </label>
            <input
              id="ws-audit-email"
              v-model="form.email"
              type="email"
              class="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="Optional"
            />
          </div>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
          <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              v-model="form.emailReportWhenReady"
              type="checkbox"
              class="rounded border-slate-600 bg-slate-900"
              :disabled="!form.email.trim()"
            />
            Email report when ready
          </label>
          <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              v-model="form.createCrmContact"
              type="checkbox"
              class="rounded border-slate-600 bg-slate-900"
              :disabled="!form.email.trim()"
            />
            Create CRM contact
          </label>
        </div>
        <p v-if="!form.email.trim()" class="text-xs text-slate-500">
          Leave email blank for a private run — the report stays in this list only.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="submitting || !form.website.trim()"
          >
            {{ submitting ? 'Starting audit…' : 'Run site audit' }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            :disabled="pending"
            @click="loadAudits"
          >
            {{ pending ? 'Refreshing…' : 'Refresh list' }}
          </button>
        </div>
        <p v-if="submitting" class="text-xs text-slate-500">
          Audit runs in the background (usually 1–2 minutes). The list updates automatically.
        </p>
        <p v-if="error" class="text-sm text-rose-300">{{ error }}</p>
      </form>
    </section>

    <div v-if="pending && !audits.length" class="py-10 text-center text-slate-500">Loading audits…</div>
    <p v-else-if="!audits.length" class="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-4 py-10 text-center text-sm text-slate-500">
      No workspace audits yet. Run one above.
    </p>

    <ul v-else class="space-y-2">
      <li
        v-for="audit in audits"
        :key="audit.id"
        class="rounded-xl border border-slate-700/70 bg-slate-900/50 transition hover:border-slate-600"
      >
        <div class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <button
            type="button"
            class="min-w-0 flex-1 text-left"
            @click="openReport(audit.publicToken)"
          >
            <p class="truncate font-medium text-white">{{ audit.website }}</p>
            <p class="mt-0.5 text-xs text-slate-500">
              {{ formatDate(audit.received_at) }}
              <span v-if="audit.name"> · {{ audit.name }}</span>
              <span v-if="audit.domain && audit.domain !== audit.website"> · {{ audit.domain }}</span>
            </p>
            <p v-if="audit.status === 'error' && audit.error_text" class="mt-1 text-xs text-rose-300">{{ audit.error_text }}</p>
          </button>
          <div class="flex shrink-0 flex-wrap items-center gap-2">
            <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="statusClass(audit.status)">
              {{ statusLabel(audit.status) }}
            </span>
            <NuxtLink
              v-if="audit.crm_client"
              :to="`/crm/clients/${audit.crm_client}`"
              class="text-xs font-medium text-sky-300 hover:underline"
            >
              CRM
            </NuxtLink>
            <button
              type="button"
              class="text-xs font-medium text-blue-400 hover:text-blue-300"
              @click="openReport(audit.publicToken)"
            >
              View report →
            </button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
type WorkspaceAuditRow = {
  id: string
  name?: string | null
  email: string
  website: string
  status: string
  crm_client?: string | null
  received_at: string
  error_text?: string | null
  reportUrl: string
  publicToken: string
  domain?: string | null
}

const pb = usePocketbase()
const pending = ref(true)
const submitting = ref(false)
const error = ref('')
const audits = ref<WorkspaceAuditRow[]>([])
let pollTimer: ReturnType<typeof setInterval> | null = null

const form = reactive({
  website: '',
  name: '',
  email: '',
  emailReportWhenReady: false,
  createCrmContact: false,
})

watch(
  () => form.email,
  (value) => {
    if (!value.trim()) {
      form.emailReportWhenReady = false
      form.createCrmContact = false
    }
  },
)

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function reportPath(token: string) {
  return `/a/${encodeURIComponent(token)}`
}

function openReport(token: string) {
  void navigateTo(reportPath(token))
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function statusClass(status: string) {
  if (status === 'ready') return 'bg-emerald-500/20 text-emerald-200'
  if (status === 'processing' || status === 'received') return 'bg-amber-500/20 text-amber-200'
  if (status === 'error') return 'bg-rose-500/20 text-rose-200'
  return 'bg-slate-700 text-slate-300'
}

function statusLabel(status: string) {
  if (status === 'ready') return 'Ready'
  if (status === 'processing') return 'Running…'
  if (status === 'received') return 'Queued'
  if (status === 'error') return 'Error'
  return status
}

const hasInProgress = computed(() =>
  audits.value.some((a) => a.status === 'processing' || a.status === 'received'),
)

async function loadAudits() {
  pending.value = true
  error.value = ''
  try {
    const res = await $fetch<{ audits: WorkspaceAuditRow[] }>('/api/workspace/website-audits', {
      headers: authHeaders(),
    })
    audits.value = res.audits ?? []
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Could not load audits.'
  } finally {
    pending.value = false
  }
}

async function submitAudit() {
  if (!form.website.trim()) return
  submitting.value = true
  error.value = ''
  try {
    const res = await $fetch<{ audits: WorkspaceAuditRow[] }>('/api/workspace/website-audits', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        website: form.website.trim(),
        name: form.name.trim() || undefined,
        email: form.email.trim() || undefined,
        emailReportWhenReady: form.emailReportWhenReady,
        createCrmContact: form.createCrmContact,
      },
    })
    audits.value = res.audits ?? []
    form.website = ''
    form.name = ''
    form.email = ''
    form.emailReportWhenReady = false
    form.createCrmContact = false
    startPolling()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Could not start audit.'
  } finally {
    submitting.value = false
  }
}

function startPolling() {
  stopPolling()
  if (!hasInProgress.value) return
  pollTimer = setInterval(() => {
    void loadAudits().then(() => {
      if (!hasInProgress.value) stopPolling()
    })
  }, 8000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(async () => {
  await loadAudits()
  startPolling()
})

onBeforeUnmount(() => stopPolling())

watch(hasInProgress, (active) => {
  if (active) startPolling()
  else stopPolling()
})
</script>
