<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-surface-900">Proposals</h1>
        <p class="mt-1 text-sm text-surface-500">Sales pipeline.</p>
      </div>
      <NuxtLink to="/crm" class="text-sm font-medium text-surface-600 hover:text-primary-600">← CRM</NuxtLink>
    </div>

    <nav class="mb-6 flex flex-wrap gap-1 border-b border-surface-200">
      <NuxtLink to="/crm" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Dashboard</NuxtLink>
      <NuxtLink to="/crm/clients" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Clients</NuxtLink>
      <NuxtLink to="/crm/pipeline" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Leads</NuxtLink>
      <NuxtLink to="/crm/tasks" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Tasks</NuxtLink>
      <NuxtLink to="/crm/deals" class="border-b-2 border-primary-600 px-4 py-3 text-sm font-medium text-primary-600">Proposals</NuxtLink>
      <NuxtLink to="/crm/onboarding" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Onboarding</NuxtLink>
    </nav>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <select v-model="statusFilter" class="rounded-lg border border-surface-300 px-3 py-2 text-sm" @change="load(statusFilter)">
        <option value="">All</option>
        <option value="open">Open</option>
        <option value="won">Won</option>
        <option value="lost">Lost</option>
      </select>
      <button
        type="button"
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
        @click="openAddModal()"
      >
        Add proposal
      </button>
    </div>

    <div v-if="pending" class="py-12 text-center text-surface-500">Loading…</div>
    <div v-else class="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-surface-200">
        <thead class="bg-surface-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Proposal</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Client</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Amount</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Status</th>
            <th class="px-4 py-3 text-right text-xs font-medium uppercase text-surface-500">Quick edit</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-200 bg-white">
          <tr v-for="s in sales" :key="s.id" class="hover:bg-surface-50/50">
            <td class="px-4 py-3 font-medium text-surface-900">{{ s.title }}</td>
            <td class="px-4 py-3 text-sm text-surface-600">
              <NuxtLink v-if="s.client" :to="`/crm/clients/${typeof s.client === 'string' ? s.client : (s.client as { id: string }).id}`" class="text-primary-600 hover:underline">
                {{ s.expand?.client?.name ?? (typeof s.client === 'string' ? s.client : '—') }}
              </NuxtLink>
              <span v-else>—</span>
            </td>
            <td class="px-4 py-3 text-sm text-surface-600">{{ formatCurrency(s.amount ?? 0) }}</td>
            <td class="px-4 py-3">
              <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium" :class="saleStatusClass(s.status)">{{ s.status }}</span>
            </td>
            <td class="px-4 py-3 text-right">
              <select
                :value="s.status"
                class="rounded border border-surface-300 text-sm"
                @change="updateStatus(s.id, ($event.target as HTMLSelectElement).value)"
              >
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!sales.length" class="px-6 py-12 text-center text-sm text-surface-500">No proposals.</div>
    </div>

    <CrmModal v-model="showAddModal" title="Add proposal">
      <form id="add-proposal-form" class="space-y-3" @submit.prevent="saveProposal">
        <div>
          <label class="block text-sm font-medium text-surface-700">Client *</label>
          <select v-model="proposalForm.client" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
            <option value="">— Select client —</option>
            <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}{{ c.company ? ` (${c.company})` : '' }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Title *</label>
          <input v-model="proposalForm.title" type="text" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" placeholder="Proposal title" />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Amount</label>
          <input v-model.number="proposalForm.amount" type="number" step="0.01" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" placeholder="0" />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Services proposed</label>
          <textarea v-model="proposalForm.services_proposed" rows="3" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" placeholder="Optional" />
        </div>
        <p v-if="addError" class="text-sm text-red-600">{{ addError }}</p>
      </form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-50" @click="showAddModal = false">Cancel</button>
          <button type="submit" form="add-proposal-form" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500" :disabled="addSaving">
            {{ addSaving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </template>
    </CrmModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const statusFilter = ref('')
const { sales, pending, load } = useCrmSales()
const { clients, load: loadClients } = useCrmClients()

const showAddModal = ref(false)
const addSaving = ref(false)
const addError = ref('')
const proposalForm = reactive({
  client: '',
  title: '',
  amount: null as number | null,
  services_proposed: '',
})

async function openAddModal() {
  addError.value = ''
  proposalForm.client = ''
  proposalForm.title = ''
  proposalForm.amount = null
  proposalForm.services_proposed = ''
  await loadClients()
  showAddModal.value = true
}

async function saveProposal() {
  if (!proposalForm.client?.trim() || !proposalForm.title?.trim()) {
    addError.value = 'Client and title are required.'
    return
  }
  addError.value = ''
  addSaving.value = true
  try {
    await $fetch('/api/crm/sales', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        client: proposalForm.client.trim(),
        title: proposalForm.title.trim(),
        amount: proposalForm.amount,
        services_proposed: proposalForm.services_proposed?.trim() || undefined,
      },
    })
    showAddModal.value = false
    await load(statusFilter.value || undefined)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    addError.value = err?.data?.message ?? err?.message ?? 'Failed to add proposal.'
  } finally {
    addSaving.value = false
  }
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n)
}

function saleStatusClass(s: string) {
  if (s === 'won') return 'bg-green-100 text-green-800'
  if (s === 'lost') return 'bg-red-100 text-red-800'
  return 'bg-surface-100 text-surface-600'
}

function authHeaders(): Record<string, string> {
  const pb = usePocketbase()
  return pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}
}

async function updateStatus(saleId: string, status: string) {
  try {
    await $fetch(`/api/crm/sales/${saleId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: { status: status as 'open' | 'won' | 'lost' },
    })
    await load(statusFilter.value || undefined)
  } catch {
    //
  }
}

onMounted(() => load(statusFilter.value || undefined))
watch(statusFilter, () => load(statusFilter.value || undefined))
</script>
