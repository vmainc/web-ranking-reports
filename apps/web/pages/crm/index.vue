<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div class="mb-8">
      <h1 class="text-2xl font-semibold text-surface-900">CRM</h1>
      <p class="mt-1 text-sm text-surface-500">Track clients, leads, sales and contact activity.</p>
    </div>

    <nav class="mb-8 flex gap-1 border-b border-surface-200">
      <NuxtLink
        :to="{ path: '/crm', query: { tab: 'clients' } }"
        class="border-b-2 px-4 py-3 text-sm font-medium transition"
        :class="tab === 'clients' ? 'border-primary-600 text-primary-600' : 'border-transparent text-surface-600 hover:text-surface-900'"
      >
        Clients
      </NuxtLink>
      <NuxtLink
        :to="{ path: '/crm', query: { tab: 'leads' } }"
        class="border-b-2 px-4 py-3 text-sm font-medium transition"
        :class="tab === 'leads' ? 'border-primary-600 text-primary-600' : 'border-transparent text-surface-600 hover:text-surface-900'"
      >
        Leads
      </NuxtLink>
      <NuxtLink
        :to="{ path: '/crm', query: { tab: 'sales' } }"
        class="border-b-2 px-4 py-3 text-sm font-medium transition"
        :class="tab === 'sales' ? 'border-primary-600 text-primary-600' : 'border-transparent text-surface-600 hover:text-surface-900'"
      >
        Sales
      </NuxtLink>
      <NuxtLink
        :to="{ path: '/crm', query: { tab: 'activity' } }"
        class="border-b-2 px-4 py-3 text-sm font-medium transition"
        :class="tab === 'activity' ? 'border-primary-600 text-primary-600' : 'border-transparent text-surface-600 hover:text-surface-900'"
      >
        Activity
      </NuxtLink>
    </nav>

    <!-- Clients -->
    <section v-show="tab === 'clients'" class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <input
            v-model="clientSearch"
            type="search"
            placeholder="Search clients…"
            class="rounded-lg border border-surface-300 px-3 py-2 text-sm"
          />
          <select v-model="clientStatusFilter" class="rounded-lg border border-surface-300 px-3 py-2 text-sm">
            <option value="">All statuses</option>
            <option value="lead">Lead</option>
            <option value="client">Client</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <button
          type="button"
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
          @click="openClientModal()"
        >
          Add client
        </button>
      </div>
      <div v-if="clientsPending" class="rounded-xl border border-surface-200 bg-white p-8 text-center text-surface-500">Loading…</div>
      <div v-else-if="!clients.length" class="rounded-xl border border-surface-200 bg-white p-8 text-center text-surface-500">No clients yet. Add one to get started.</div>
      <div v-else class="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
        <table class="min-w-full divide-y divide-surface-200">
          <thead class="bg-surface-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Name</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Company</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Contact</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Status</th>
              <th class="px-4 py-3 text-right text-xs font-medium uppercase text-surface-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-200">
            <tr v-for="c in clients" :key="c.id" class="hover:bg-surface-50/50">
              <td class="px-4 py-3 font-medium text-surface-900">{{ c.name }}</td>
              <td class="px-4 py-3 text-sm text-surface-600">{{ c.company || '—' }}</td>
              <td class="px-4 py-3 text-sm text-surface-600">{{ c.email || c.phone || '—' }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusClass(c.status)">{{ c.status }}</span>
              </td>
              <td class="px-4 py-3 text-right">
                <button type="button" class="text-primary-600 hover:underline" @click="openClientModal(c)">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Leads (clients with status=lead) -->
    <section v-show="tab === 'leads'" class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <p class="text-sm text-surface-500">Contacts marked as leads. Change status to Client when they convert.</p>
        <button
          type="button"
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
          @click="openClientModal(undefined, 'lead')"
        >
          Add lead
        </button>
      </div>
      <div v-if="leadsPending" class="rounded-xl border border-surface-200 bg-white p-8 text-center text-surface-500">Loading…</div>
      <div v-else-if="!leads.length" class="rounded-xl border border-surface-200 bg-white p-8 text-center text-surface-500">No leads yet.</div>
      <div v-else class="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
        <table class="min-w-full divide-y divide-surface-200">
          <thead class="bg-surface-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Name</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Company</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Contact</th>
              <th class="px-4 py-3 text-right text-xs font-medium uppercase text-surface-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-200">
            <tr v-for="c in leads" :key="c.id" class="hover:bg-surface-50/50">
              <td class="px-4 py-3 font-medium text-surface-900">{{ c.name }}</td>
              <td class="px-4 py-3 text-sm text-surface-600">{{ c.company || '—' }}</td>
              <td class="px-4 py-3 text-sm text-surface-600">{{ c.email || c.phone || '—' }}</td>
              <td class="px-4 py-3 text-right">
                <button type="button" class="text-primary-600 hover:underline" @click="openClientModal(c)">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Sales -->
    <section v-show="tab === 'sales'" class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <select v-model="saleStatusFilter" class="rounded-lg border border-surface-300 px-3 py-2 text-sm">
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
        <button
          type="button"
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
          @click="openSaleModal()"
        >
          Add sale
        </button>
      </div>
      <div v-if="salesPending" class="rounded-xl border border-surface-200 bg-white p-8 text-center text-surface-500">Loading…</div>
      <div v-else-if="!sales.length" class="rounded-xl border border-surface-200 bg-white p-8 text-center text-surface-500">No sales yet.</div>
      <div v-else class="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
        <table class="min-w-full divide-y divide-surface-200">
          <thead class="bg-surface-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Deal</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Client</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Amount</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Status</th>
              <th class="px-4 py-3 text-right text-xs font-medium uppercase text-surface-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-200">
            <tr v-for="s in sales" :key="s.id" class="hover:bg-surface-50/50">
              <td class="px-4 py-3 font-medium text-surface-900">{{ s.title }}</td>
              <td class="px-4 py-3 text-sm text-surface-600">{{ s.expand?.client?.name ?? expandClientName(s.client) }}</td>
              <td class="px-4 py-3 text-sm text-surface-600">{{ s.amount != null ? formatCurrency(s.amount) : '—' }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium" :class="saleStatusClass(s.status)">{{ s.status }}</span>
              </td>
              <td class="px-4 py-3 text-right">
                <button type="button" class="text-primary-600 hover:underline" @click="openSaleModal(s)">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Activity (contact points) -->
    <section v-show="tab === 'activity'" class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <select v-model="activityClientFilter" class="rounded-lg border border-surface-300 px-3 py-2 text-sm">
          <option value="">All clients</option>
          <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <button
          type="button"
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
          @click="openActivityModal()"
        >
          Log activity
        </button>
      </div>
      <div v-if="activityPending" class="rounded-xl border border-surface-200 bg-white p-8 text-center text-surface-500">Loading…</div>
      <div v-else-if="!contactPoints.length" class="rounded-xl border border-surface-200 bg-white p-8 text-center text-surface-500">No activity yet.</div>
      <div v-else class="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
        <table class="min-w-full divide-y divide-surface-200">
          <thead class="bg-surface-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Date</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Type</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Client</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Summary</th>
              <th class="px-4 py-3 text-right text-xs font-medium uppercase text-surface-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-200">
            <tr v-for="a in contactPoints" :key="a.id" class="hover:bg-surface-50/50">
              <td class="px-4 py-3 text-sm text-surface-600">{{ formatDate(a.happened_at) }}</td>
              <td class="px-4 py-3"><span class="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-surface-100 text-surface-700">{{ a.kind }}</span></td>
              <td class="px-4 py-3 text-sm text-surface-600">{{ a.expand?.client?.name ?? expandClientName(a.client) }}</td>
              <td class="px-4 py-3 text-sm text-surface-600">{{ a.summary || '—' }}</td>
              <td class="px-4 py-3 text-right">
                <button type="button" class="text-primary-600 hover:underline" @click="openActivityModal(a)">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Client modal -->
    <Teleport to="body">
      <div v-if="clientModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="clientModalOpen = false">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" @click.stop>
          <h3 class="text-lg font-semibold text-surface-900">{{ editingClient ? 'Edit client' : 'Add client' }}</h3>
          <form class="mt-4 space-y-3" @submit.prevent="saveClient">
            <div>
              <label class="block text-sm font-medium text-surface-700">Name *</label>
              <input v-model="clientForm.name" type="text" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Email</label>
              <input v-model="clientForm.email" type="email" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Phone</label>
              <input v-model="clientForm.phone" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Company</label>
              <input v-model="clientForm.company" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Status</label>
              <select v-model="clientForm.status" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
                <option value="lead">Lead</option>
                <option value="client">Client</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Notes</label>
              <textarea v-model="clientForm.notes" rows="2" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50" @click="clientModalOpen = false">Cancel</button>
              <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500">Save</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Sale modal -->
    <Teleport to="body">
      <div v-if="saleModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="saleModalOpen = false">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" @click.stop>
          <h3 class="text-lg font-semibold text-surface-900">{{ editingSale ? 'Edit sale' : 'Add sale' }}</h3>
          <form class="mt-4 space-y-3" @submit.prevent="saveSale">
            <div>
              <label class="block text-sm font-medium text-surface-700">Client *</label>
              <select v-model="saleForm.client" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
                <option value="">Select client</option>
                <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}{{ c.company ? ` (${c.company})` : '' }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Title *</label>
              <input v-model="saleForm.title" type="text" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Amount</label>
              <input v-model.number="saleForm.amount" type="number" step="0.01" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Status</label>
              <select v-model="saleForm.status" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Notes</label>
              <textarea v-model="saleForm.notes" rows="2" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50" @click="saleModalOpen = false">Cancel</button>
              <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500">Save</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Activity modal -->
    <Teleport to="body">
      <div v-if="activityModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="activityModalOpen = false">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" @click.stop>
          <h3 class="text-lg font-semibold text-surface-900">{{ editingActivity ? 'Edit activity' : 'Log activity' }}</h3>
          <form class="mt-4 space-y-3" @submit.prevent="saveActivity">
            <div>
              <label class="block text-sm font-medium text-surface-700">Client *</label>
              <select v-model="activityForm.client" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
                <option value="">Select client</option>
                <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}{{ c.company ? ` (${c.company})` : '' }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Type</label>
              <select v-model="activityForm.kind" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="note">Note</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Date *</label>
              <input v-model="activityForm.happened_at" type="datetime-local" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Summary</label>
              <textarea v-model="activityForm.summary" rows="2" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50" @click="activityModalOpen = false">Cancel</button>
              <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500">Save</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { CrmClient, CrmSale, CrmContactPoint } from '~/types'

const route = useRoute()
const pb = usePocketbase()

const tab = computed(() => {
  const q = (route.query.tab as string) || 'clients'
  if (['leads', 'sales', 'activity'].includes(q)) return q
  return 'clients'
})

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const clients = ref<CrmClient[]>([])
const clientsPending = ref(false)
const clientSearch = ref('')
const clientStatusFilter = ref('')
const clientModalOpen = ref(false)
const editingClient = ref<CrmClient | null>(null)
const clientForm = reactive({ name: '', email: '', phone: '', company: '', status: 'lead' as 'lead' | 'client' | 'archived', notes: '' })

const leads = computed(() => clients.value.filter((c) => c.status === 'lead'))
const leadsPending = computed(() => clientsPending.value)

const sales = ref<(CrmSale & { expand?: { client?: CrmClient } })[]>([])
const salesPending = ref(false)
const saleStatusFilter = ref('')
const saleModalOpen = ref(false)
const editingSale = ref<(CrmSale & { expand?: { client?: CrmClient } }) | null>(null)
const saleForm = reactive({ client: '', title: '', amount: null as number | null, status: 'open' as 'open' | 'won' | 'lost', notes: '' })

const contactPoints = ref<(CrmContactPoint & { expand?: { client?: CrmClient } })[]>([])
const activityPending = ref(false)
const activityClientFilter = ref('')
const activityModalOpen = ref(false)
const editingActivity = ref<(CrmContactPoint & { expand?: { client?: CrmClient } }) | null>(null)
const activityForm = reactive({ client: '', kind: 'note' as 'call' | 'email' | 'meeting' | 'note', happened_at: '', summary: '' })

function statusClass(s: string) {
  if (s === 'client') return 'bg-green-100 text-green-800'
  if (s === 'lead') return 'bg-amber-100 text-amber-800'
  return 'bg-surface-100 text-surface-600'
}
function saleStatusClass(s: string) {
  if (s === 'won') return 'bg-green-100 text-green-800'
  if (s === 'lost') return 'bg-red-100 text-red-800'
  return 'bg-surface-100 text-surface-600'
}
function formatDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}
function formatCurrency(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n)
}
function expandClientName(client: string | { id: string; name?: string } | undefined) {
  if (!client) return '—'
  if (typeof client === 'object' && client?.name) return client.name
  const c = clients.value.find((x) => x.id === client)
  return c?.name ?? '—'
}

async function loadClients() {
  clientsPending.value = true
  try {
    const q: Record<string, string> = {}
    const statusFilter = tab.value === 'leads' ? 'lead' : clientStatusFilter.value
    if (statusFilter) q.status = statusFilter
    if (clientSearch.value.trim()) q.search = clientSearch.value.trim()
    const data = await $fetch<{ clients: CrmClient[] }>('/api/crm/clients', { headers: authHeaders(), query: q })
    clients.value = data.clients ?? []
  } catch {
    clients.value = []
  } finally {
    clientsPending.value = false
  }
}

async function loadSales() {
  salesPending.value = true
  try {
    const q: Record<string, string> = {}
    if (saleStatusFilter.value) q.status = saleStatusFilter.value
    const data = await $fetch<{ sales: (CrmSale & { expand?: { client?: CrmClient } })[] }>('/api/crm/sales', { headers: authHeaders(), query: q })
    sales.value = data.sales ?? []
  } catch {
    sales.value = []
  } finally {
    salesPending.value = false
  }
}

async function loadContactPoints() {
  activityPending.value = true
  try {
    const q: Record<string, string> = {}
    if (activityClientFilter.value) q.client = activityClientFilter.value
    const data = await $fetch<{ contactPoints: (CrmContactPoint & { expand?: { client?: CrmClient } })[] }>('/api/crm/contact-points', { headers: authHeaders(), query: q })
    contactPoints.value = data.contactPoints ?? []
  } catch {
    contactPoints.value = []
  } finally {
    activityPending.value = false
  }
}

function openClientModal(client?: CrmClient | null, defaultStatus?: 'lead') {
  editingClient.value = client ?? null
  clientForm.name = client?.name ?? ''
  clientForm.email = client?.email ?? ''
  clientForm.phone = client?.phone ?? ''
  clientForm.company = client?.company ?? ''
  clientForm.status = (client?.status ?? defaultStatus ?? 'lead') as 'lead' | 'client' | 'archived'
  clientForm.notes = client?.notes ?? ''
  clientModalOpen.value = true
}

async function saveClient() {
  try {
    if (editingClient.value) {
      await $fetch(`/api/crm/clients/${editingClient.value.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: { name: clientForm.name, email: clientForm.email || null, phone: clientForm.phone || null, company: clientForm.company || null, status: clientForm.status, notes: clientForm.notes || null },
      })
    } else {
      await $fetch('/api/crm/clients', {
        method: 'POST',
        headers: authHeaders(),
        body: { name: clientForm.name, email: clientForm.email || null, phone: clientForm.phone || null, company: clientForm.company || null, status: clientForm.status, notes: clientForm.notes || null },
      })
    }
    clientModalOpen.value = false
    await loadClients()
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message || (e as Error).message || 'Failed to save')
  }
}

function openSaleModal(sale?: (CrmSale & { expand?: { client?: CrmClient } }) | null) {
  editingSale.value = sale ?? null
  saleForm.client = typeof sale?.client === 'string' ? sale.client : (sale?.client as { id?: string })?.id ?? ''
  saleForm.title = sale?.title ?? ''
  saleForm.amount = sale?.amount ?? null
  saleForm.status = (sale?.status ?? 'open') as 'open' | 'won' | 'lost'
  saleForm.notes = sale?.notes ?? ''
  saleModalOpen.value = true
}

async function saveSale() {
  try {
    if (editingSale.value) {
      await $fetch(`/api/crm/sales/${editingSale.value.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: { title: saleForm.title, amount: saleForm.amount, status: saleForm.status, notes: saleForm.notes || null },
      })
    } else {
      await $fetch('/api/crm/sales', {
        method: 'POST',
        headers: authHeaders(),
        body: { client: saleForm.client, title: saleForm.title, amount: saleForm.amount, status: saleForm.status, notes: saleForm.notes || null },
      })
    }
    saleModalOpen.value = false
    await loadSales()
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message || (e as Error).message || 'Failed to save')
  }
}

function openActivityModal(activity?: (CrmContactPoint & { expand?: { client?: CrmClient } }) | null) {
  editingActivity.value = activity ?? null
  activityForm.client = typeof activity?.client === 'string' ? activity.client : (activity?.client as { id?: string })?.id ?? ''
  activityForm.kind = (activity?.kind ?? 'note') as 'call' | 'email' | 'meeting' | 'note'
  const d = activity?.happened_at ? new Date(activity.happened_at) : new Date()
  activityForm.happened_at = d.toISOString().slice(0, 16)
  activityForm.summary = activity?.summary ?? ''
  activityModalOpen.value = true
}

async function saveActivity() {
  try {
    const happenedAt = new Date(activityForm.happened_at).toISOString()
    if (editingActivity.value) {
      await $fetch(`/api/crm/contact-points/${editingActivity.value.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: { kind: activityForm.kind, happened_at: happenedAt, summary: activityForm.summary || null },
      })
    } else {
      await $fetch('/api/crm/contact-points', {
        method: 'POST',
        headers: authHeaders(),
        body: { client: activityForm.client, kind: activityForm.kind, happened_at: happenedAt, summary: activityForm.summary || null },
      })
    }
    activityModalOpen.value = false
    await loadContactPoints()
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message || (e as Error).message || 'Failed to save')
  }
}

let clientSearchTimeout: ReturnType<typeof setTimeout> | null = null
watch([clientSearch, clientStatusFilter, tab], () => {
  if (clientSearchTimeout) clearTimeout(clientSearchTimeout)
  clientSearchTimeout = setTimeout(() => loadClients(), 300)
})
watch(saleStatusFilter, () => loadSales())
watch(activityClientFilter, () => loadContactPoints())

onMounted(() => {
  loadClients()
  loadSales()
  loadContactPoints()
})
</script>
