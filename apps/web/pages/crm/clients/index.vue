<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-surface-900">Clients</h1>
        <p class="mt-1 text-sm text-surface-500">Leads and clients.</p>
      </div>
      <NuxtLink to="/crm" class="text-sm font-medium text-surface-600 hover:text-primary-600">← CRM</NuxtLink>
    </div>

    <nav class="mb-6 flex flex-wrap gap-1 border-b border-surface-200">
      <NuxtLink to="/crm" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Dashboard</NuxtLink>
      <NuxtLink to="/crm/clients" class="border-b-2 border-primary-600 px-4 py-3 text-sm font-medium text-primary-600">Clients</NuxtLink>
      <NuxtLink to="/crm/pipeline" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Leads</NuxtLink>
      <NuxtLink to="/crm/tasks" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Tasks</NuxtLink>
      <NuxtLink to="/crm/deals" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Proposals</NuxtLink>
      <NuxtLink to="/crm/onboarding" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Onboarding</NuxtLink>
    </nav>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <input
        v-model="search"
        type="search"
        placeholder="Search…"
        class="rounded-lg border border-surface-300 px-3 py-2 text-sm"
      />
      <select v-model="statusFilter" class="rounded-lg border border-surface-300 px-3 py-2 text-sm">
        <option value="">All statuses</option>
        <option value="lead">Lead</option>
        <option value="client">Client</option>
        <option value="archived">Archived</option>
      </select>
      <select v-model="pipelineFilter" class="rounded-lg border border-surface-300 px-3 py-2 text-sm">
        <option value="">All stages</option>
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="qualified">Qualified</option>
        <option value="proposal">Proposal</option>
        <option value="won">Won</option>
        <option value="lost">Lost</option>
      </select>
      <button
        type="button"
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
        @click="openAddClient"
      >
        Add client
      </button>
    </div>

    <CrmDataTable
      :columns="columns"
      :rows="clients"
      :pending="pending"
    >
      <template #cell-name="{ row, value }">
        <NuxtLink
          :to="`/crm/clients/${(row as { id: string }).id}`"
          class="text-primary-600 hover:underline"
        >
          {{ value }}
        </NuxtLink>
      </template>
      <template #cell-status="{ value }">
        <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusClass(value)">{{ value }}</span>
      </template>
      <template #cell-pipeline_stage="{ value }">
        {{ value || 'new' }}
      </template>
      <template #actions="{ row }">
        <span class="flex items-center gap-2">
          <NuxtLink :to="`/crm/clients/${(row as { id: string }).id}`" class="text-primary-600 hover:underline">View</NuxtLink>
          <button
            type="button"
            class="text-red-600 hover:underline disabled:opacity-50"
            :disabled="deletingId === (row as { id: string }).id"
            @click="deleteClient((row as { id: string }).id, (row as { name?: string }).name)"
          >
            {{ deletingId === (row as { id: string }).id ? '…' : 'Delete' }}
          </button>
        </span>
      </template>
    </CrmDataTable>

    <CrmModal v-model="showModal" title="Add client">
      <form id="client-form" class="space-y-3" @submit.prevent="saveClient">
        <div v-if="Object.keys(formErrors).length" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <p v-for="(msg, key) in formErrors" :key="key">{{ msg }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Name *</label>
          <input v-model="form.name" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" :class="{ 'border-red-500': formErrors.name }" />
          <p v-if="formErrors.name" class="mt-1 text-xs text-red-600">{{ formErrors.name }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Email</label>
          <input v-model="form.email" type="email" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" :class="{ 'border-red-500': formErrors.email }" />
          <p v-if="formErrors.email" class="mt-1 text-xs text-red-600">{{ formErrors.email }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Company</label>
          <input v-model="form.company" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Status</label>
          <select v-model="form.status" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
            <option value="lead">Lead</option>
            <option value="client">Client</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-50" @click="showModal = false">Cancel</button>
          <button type="submit" form="client-form" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500">Save</button>
        </div>
      </template>
    </CrmModal>
  </div>
</template>

<script setup lang="ts">
import { crmClientSchema } from '~/lib/crmSchemas'

definePageMeta({ layout: 'default' })

const { clients, pending, load } = useCrmClients()
const route = useRoute()
const statusFilter = ref((route.query.status as string) || '')
const pipelineFilter = ref((route.query.pipeline_stage as string) || '')
const search = ref('')
const showModal = ref(false)
const form = reactive({ name: '', email: '', company: '', status: 'lead' as 'lead' | 'client' | 'archived' })
const formErrors = ref<Record<string, string>>({})
const deletingId = ref<string | null>(null)

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status' },
  { key: 'pipeline_stage', label: 'Stage' },
]

function statusClass(s: string) {
  if (s === 'client') return 'bg-green-100 text-green-800'
  if (s === 'lead') return 'bg-amber-100 text-amber-800'
  return 'bg-surface-100 text-surface-600'
}

function openAddClient() {
  form.name = ''
  form.email = ''
  form.company = ''
  form.status = 'lead'
  showModal.value = true
}

function authHeaders(): Record<string, string> {
  const pb = usePocketbase()
  return pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}
}

async function deleteClient(id: string, name?: string) {
  if (!confirm(`Delete ${name || 'this client'}? This cannot be undone.`)) return
  deletingId.value = id
  try {
    await $fetch(`/api/crm/clients/${id}`, { method: 'DELETE', headers: authHeaders() })
    await load({ status: statusFilter.value || undefined, pipeline_stage: pipelineFilter.value || undefined, search: search.value || undefined })
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed to delete')
  } finally {
    deletingId.value = null
  }
}

async function saveClient() {
  formErrors.value = {}
  const payload = {
    name: form.name,
    email: form.email || undefined,
    company: form.company || undefined,
    status: form.status,
    pipeline_stage: 'new' as const,
    notes: undefined,
  }
  const parsed = crmClientSchema.safeParse(payload)
  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors
    formErrors.value = Object.fromEntries(
      Object.entries(issues).map(([k, v]) => [k, Array.isArray(v) ? v[0] ?? '' : String(v)])
    ) as Record<string, string>
    return
  }
  const pb = usePocketbase()
  const userId = pb.authStore.model?.id as string | undefined
  if (!userId) {
    alert('Not authenticated')
    return
  }
  try {
    const created = await pb.collection('crm_clients').create({
      user: userId,
      name: parsed.data.name.trim(),
      email: parsed.data.email?.trim() || null,
      company: parsed.data.company?.trim() || null,
      status: parsed.data.status,
      pipeline_stage: 'new',
    })
    showModal.value = false
    await load({ status: statusFilter.value || undefined, pipeline_stage: pipelineFilter.value || undefined, search: search.value || undefined })
    if (created?.id) {
      navigateTo(`/crm/clients/${created.id}`)
    }
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed to save')
  }
}

watch([statusFilter, pipelineFilter, search], () => {
  load({ status: statusFilter.value || undefined, pipeline_stage: pipelineFilter.value || undefined, search: search.value || undefined })
}, { immediate: true })
</script>
