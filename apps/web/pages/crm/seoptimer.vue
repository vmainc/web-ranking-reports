<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-white">SEOptimer</h1>
      <p class="mt-1 text-sm text-slate-400">
        Webhook leads stay here until you add them to the CRM. They are not counted as CRM leads until then.
      </p>
    </div>

    <CrmSubNav />

    <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-surface-900">Webhook integration</h2>
      <p class="mt-1 text-sm text-surface-600">
        In SEOptimer → Embedding → Webhook, enable the webhook and paste the URL below. Use the same API key shown in SEOptimer here so we can verify requests.
        Optional: enable “Include link to customer’s PDF report” in SEOptimer; the webhook may arrive slightly later while the PDF is generated.
      </p>
      <p class="mt-2 text-sm">
        <a
          href="https://www.seoptimer.com/blog/webhook-guide"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-primary-600 hover:underline"
        >SEOptimer webhook guide</a>
      </p>

      <div v-if="settingsPending" class="mt-4 text-sm text-surface-500">Loading settings…</div>
      <div v-else class="mt-4 space-y-4">
        <div>
          <label class="block text-sm font-medium text-surface-700">Webhook handler URL</label>
          <div class="mt-1 flex flex-wrap gap-2">
            <input
              :value="webhookDisplayUrl"
              type="text"
              readonly
              class="min-w-0 flex-1 rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 font-mono text-sm"
            />
            <button
              type="button"
              class="rounded-lg border border-surface-300 px-3 py-2 text-sm font-medium hover:bg-surface-50"
              @click="copyUrl"
            >
              Copy
            </button>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">SEOptimer API key</label>
          <input
            v-model="keyInput"
            type="password"
            autocomplete="off"
            placeholder="Paste the key from SEOptimer embedding settings"
            class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
          />
          <p class="mt-1 text-xs text-surface-500">
            <span v-if="webhookKeyConfigured">A key is saved. Enter a new key to replace it.</span>
            <span v-else>Paste the key from SEOptimer, then save.</span>
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="keySaving"
            @click="saveKey"
          >
            {{ keySaving ? 'Saving…' : 'Save API key' }}
          </button>
          <button
            v-if="webhookKeyConfigured"
            type="button"
            class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
            :disabled="keySaving"
            @click="removeKey"
          >
            Remove key
          </button>
          <button
            type="button"
            class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
            :disabled="keySaving || leadsPending"
            @click="loadLeads"
          >
            {{ leadsPending ? 'Refreshing…' : 'Refresh leads' }}
          </button>
          <span v-if="settingsError" class="text-sm text-red-600">{{ settingsError }}</span>
          <span v-else-if="settingsInfo" class="text-sm text-emerald-700">{{ settingsInfo }}</span>
        </div>
      </div>
    </section>

    <p v-if="leadsError" class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{{ leadsError }}</p>

    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-lg font-semibold text-surface-900">Leads</h2>
      <label class="flex items-center gap-2 text-sm text-surface-700">
        <input v-model="pendingOnly" type="checkbox" class="rounded border-surface-300" @change="loadLeads" />
        Pending only (not in CRM yet)
      </label>
    </div>

    <div v-if="leadsPending" class="py-12 text-center text-sm text-surface-500">Loading…</div>
    <CrmDataTable v-else :columns="columns" :rows="leads" :pending="leadsPending">
      <template #cell-received_at="{ value }">
        {{ formatDate(value as string) }}
      </template>
      <template #cell-status="{ row }">
        <template v-if="(row as SeoptimerLead).crm_client">
          <NuxtLink
            :to="`/crm/clients/${(row as SeoptimerLead).crm_client}`"
            class="font-medium text-primary-600 hover:underline"
          >In CRM</NuxtLink>
        </template>
        <span v-else class="text-surface-600">Pending</span>
      </template>
      <template #actions="{ row }">
        <div class="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            class="text-sm font-medium text-primary-600 hover:underline"
            @click="openEdit(row as SeoptimerLead)"
          >
            Edit
          </button>
          <button
            v-if="!(row as SeoptimerLead).crm_client"
            type="button"
            class="text-sm font-medium text-primary-600 hover:underline"
            @click="openConvert(row as SeoptimerLead)"
          >
            Add to CRM
          </button>
        </div>
      </template>
      <template #empty>No SEOptimer leads yet.</template>
    </CrmDataTable>

    <CrmModal v-model="showEdit" title="Edit SEOptimer lead">
      <form id="seoptimer-edit-form" class="space-y-3" @submit.prevent="saveEdit">
        <div>
          <label class="block text-sm font-medium text-surface-700">Name</label>
          <input v-model="editForm.name" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Email</label>
          <input v-model="editForm.email" type="email" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Phone</label>
          <input v-model="editForm.phone" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Website</label>
          <input v-model="editForm.website" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Audit URL</label>
          <input v-model="editForm.audit_url" type="url" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">PDF report URL</label>
          <input v-model="editForm.pdf_report_url" type="url" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Notes</label>
          <textarea v-model="editForm.notes" rows="3" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"></textarea>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-50" @click="showEdit = false">Cancel</button>
          <button type="submit" form="seoptimer-edit-form" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500" :disabled="editSaving">
            {{ editSaving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </template>
    </CrmModal>

    <CrmModal v-model="showConvert" title="Add to CRM">
      <p class="text-sm text-surface-600">
        This creates a new CRM contact (lead) from this submission. The SEOptimer row will stay linked for reference.
      </p>
      <form id="seoptimer-convert-form" class="mt-4 space-y-3" @submit.prevent="doConvert">
        <div>
          <label class="block text-sm font-medium text-surface-700">Contact name *</label>
          <input v-model="convertForm.name" type="text" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Company</label>
          <input v-model="convertForm.company" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" placeholder="Defaults to website if empty" />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Extra notes for CRM</label>
          <textarea v-model="convertForm.notes" rows="2" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"></textarea>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-50" @click="showConvert = false">Cancel</button>
          <button type="submit" form="seoptimer-convert-form" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500" :disabled="convertSaving">
            {{ convertSaving ? 'Creating…' : 'Add to CRM' }}
          </button>
        </div>
      </template>
    </CrmModal>
  </div>
</template>

<script setup lang="ts">
import type { SeoptimerLead } from '~/types'

definePageMeta({ layout: 'default' })

const columns = [
  { key: 'received_at', label: 'Received' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
  { key: 'status', label: 'CRM' },
]

/** Set from GET /api/account/seoptimer-settings (uses request Host); avoids SSR/client appUrl mismatch. */
const webhookDisplayUrl = ref('')

const settingsPending = ref(true)
const webhookKeyConfigured = ref(false)
const keyInput = ref('')
const keySaving = ref(false)
const settingsError = ref('')
const settingsInfo = ref('')

const leads = ref<SeoptimerLead[]>([])
const leadsPending = ref(true)
const pendingOnly = ref(true)

const showEdit = ref(false)
const editSaving = ref(false)
const editingId = ref<string | null>(null)
const editForm = reactive({
  name: '',
  email: '',
  phone: '',
  website: '',
  audit_url: '',
  pdf_report_url: '',
  notes: '',
})

const showConvert = ref(false)
const convertSaving = ref(false)
const converting = ref<SeoptimerLead | null>(null)
let refreshTimer: ReturnType<typeof setInterval> | null = null
const convertForm = reactive({
  name: '',
  company: '',
  notes: '',
})

function authHeaders(): Record<string, string> {
  const pb = usePocketbase()
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function fetchErrorMessage(e: unknown, fallback: string): string {
  const err = e as { data?: { message?: string }; statusMessage?: string; message?: string }
  return err.data?.message || err.statusMessage || err.message || fallback
}

async function loadSettings() {
  settingsPending.value = true
  settingsError.value = ''
  try {
    const data = await $fetch<{ webhookUrl?: string; webhookKeyConfigured?: boolean }>('/api/account/seoptimer-settings', {
      headers: authHeaders(),
    })
    webhookDisplayUrl.value = (data.webhookUrl || '').trim()
    webhookKeyConfigured.value = !!data.webhookKeyConfigured
    keyInput.value = ''
  } catch (e: unknown) {
    settingsError.value = fetchErrorMessage(e, 'Could not load settings.')
  } finally {
    settingsPending.value = false
  }
}

const leadsError = ref('')

async function loadLeads() {
  leadsPending.value = true
  leadsError.value = ''
  try {
    const q = pendingOnly.value ? '?pending=1' : ''
    const data = await $fetch<{ leads?: SeoptimerLead[] }>(`/api/crm/seoptimer-leads${q}`, { headers: authHeaders() })
    leads.value = data.leads ?? []
  } catch (e: unknown) {
    leads.value = []
    leadsError.value = fetchErrorMessage(e, 'Could not load SEOptimer leads.')
  } finally {
    leadsPending.value = false
  }
}

async function saveKey() {
  const v = keyInput.value.trim()
  if (!v) {
    settingsError.value = 'Paste your SEOptimer API key before saving.'
    return
  }
  keySaving.value = true
  settingsError.value = ''
  settingsInfo.value = ''
  try {
    await $fetch('/api/account/seoptimer-settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: { webhookKey: v },
    })
    await loadSettings()
    await loadLeads()
    keyInput.value = ''
    settingsInfo.value = 'API key saved. In SEOptimer click Test Call (or submit an audit), then refresh leads.'
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string }; message?: string })?.data?.message ?? (e as Error)?.message ?? 'Save failed'
    settingsError.value = msg
  } finally {
    keySaving.value = false
  }
}

async function removeKey() {
  if (!confirm('Remove the SEOptimer API key? Webhook calls will stop working until you save a new key.')) return
  keySaving.value = true
  settingsError.value = ''
  settingsInfo.value = ''
  try {
    await $fetch('/api/account/seoptimer-settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: { webhookKey: null },
    })
    await loadSettings()
    keyInput.value = ''
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string }; message?: string })?.data?.message ?? (e as Error)?.message ?? 'Remove failed'
    settingsError.value = msg
  } finally {
    keySaving.value = false
  }
}

function copyUrl() {
  void navigator.clipboard.writeText(webhookDisplayUrl.value).catch(() => {})
}

function openEdit(row: SeoptimerLead) {
  editingId.value = row.id
  editForm.name = row.name ?? ''
  editForm.email = row.email ?? ''
  editForm.phone = row.phone ?? ''
  editForm.website = row.website ?? ''
  editForm.audit_url = row.audit_url ?? ''
  editForm.pdf_report_url = row.pdf_report_url ?? ''
  editForm.notes = row.notes ?? ''
  showEdit.value = true
}

async function saveEdit() {
  if (!editingId.value) return
  editSaving.value = true
  try {
    await $fetch(`/api/crm/seoptimer-leads/${editingId.value}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: { ...editForm },
    })
    showEdit.value = false
    await loadLeads()
  } catch (e: unknown) {
    alert((e as { data?: { message?: string } })?.data?.message ?? 'Update failed')
  } finally {
    editSaving.value = false
  }
}

function openConvert(row: SeoptimerLead) {
  converting.value = row
  const fallback =
    row.name?.trim() ||
    (row.email?.trim() ? row.email.trim().split('@')[0] : '') ||
    row.website?.trim() ||
    'SEOptimer lead'
  convertForm.name = fallback
  convertForm.company = row.website?.trim() || ''
  convertForm.notes = ''
  showConvert.value = true
}

async function doConvert() {
  if (!converting.value) return
  convertSaving.value = true
  try {
    const res = await $fetch<{ client?: { id: string } }>(`/api/crm/seoptimer-leads/${converting.value.id}/convert`, {
      method: 'POST',
      headers: authHeaders(),
      body: {
        name: convertForm.name.trim(),
        company: convertForm.company.trim() || null,
        notes: convertForm.notes.trim() || null,
      },
    })
    showConvert.value = false
    await loadLeads()
    if (res.client?.id) {
      await navigateTo(`/crm/clients/${res.client.id}`)
    }
  } catch (e: unknown) {
    alert((e as { data?: { message?: string } })?.data?.message ?? 'Could not create CRM contact')
  } finally {
    convertSaving.value = false
  }
}

onMounted(async () => {
  await loadSettings()
  await loadLeads()
  // Keep this inbox reasonably fresh while the tab is open.
  refreshTimer = window.setInterval(() => {
    void loadLeads()
  }, 30000)
})

onBeforeUnmount(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
    refreshTimer = null
  }
})
</script>
