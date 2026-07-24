<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-surface-900">Proposals</h1>
        <p class="mt-1 text-sm text-surface-500">Document proposals linked to CRM deals. Deals stay on the Deals page.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <NuxtLink
          to="/crm/proposals/settings"
          class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
        >
          Catalog settings
        </NuxtLink>
        <button
          type="button"
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
          @click="openCreate"
        >
          New proposal
        </button>
      </div>
    </div>

    <CrmSubNav />

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <select v-model="statusFilter" class="rounded-lg border border-surface-300 px-3 py-2 text-sm" @change="load(statusFilter || undefined)">
        <option value="">All statuses</option>
        <option value="draft">Draft</option>
        <option value="sent">Sent</option>
        <option value="viewed">Viewed</option>
        <option value="accepted">Accepted</option>
        <option value="declined">Declined</option>
        <option value="superseded">Superseded</option>
      </select>
    </div>

    <div v-if="pending" class="py-12 text-center text-surface-500">Loading…</div>
    <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</div>
    <div v-else class="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-surface-200">
        <thead class="bg-surface-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Proposal</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Contact</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Version</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Total</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-200">
          <tr v-for="p in proposals" :key="p.id" class="hover:bg-surface-50/50">
            <td class="px-4 py-3">
              <NuxtLink :to="`/crm/proposals/${p.id}`" class="font-medium text-primary-600 hover:underline">{{ p.title }}</NuxtLink>
            </td>
            <td class="px-4 py-3 text-sm text-surface-600">
              <NuxtLink v-if="p.client" :to="`/crm/clients/${typeof p.client === 'string' ? p.client : p.client}`" class="hover:underline">
                {{ p.expand?.client?.name ?? '—' }}
              </NuxtLink>
            </td>
            <td class="px-4 py-3 text-sm text-surface-600">v{{ p.version }}</td>
            <td class="px-4 py-3 text-sm text-surface-600">{{ formatMoney(p.total ?? 0, p.currency) }}</td>
            <td class="px-4 py-3">
              <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize" :class="statusClass(p.status)">{{ p.status }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!proposals.length" class="px-6 py-12 text-center text-sm text-surface-500">No proposals yet.</div>
    </div>

    <CrmModal v-model="showCreate" title="New proposal">
      <form id="create-proposal-form" class="space-y-3" @submit.prevent="createProposal">
        <div>
          <label class="block text-sm font-medium text-surface-700">Contact *</label>
          <select v-model="form.client" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
            <option value="">— Select —</option>
            <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}{{ c.company ? ` (${c.company})` : '' }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Title *</label>
          <input v-model="form.title" type="text" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" placeholder="SEO + reporting package" />
        </div>
        <p v-if="createError" class="text-sm text-red-600">{{ createError }}</p>
      </form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-50" @click="showCreate = false">Cancel</button>
          <button type="submit" form="create-proposal-form" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500" :disabled="creating">
            {{ creating ? 'Creating…' : 'Create draft' }}
          </button>
        </div>
      </template>
    </CrmModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const statusFilter = ref('')
const { proposals, pending, error, load } = useCrmProposals()
const { clients, load: loadClients } = useCrmClients()
const router = useRouter()

const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const form = reactive({ client: '', title: '' })

function authHeaders(): Record<string, string> {
  const pb = usePocketbase()
  return pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}
}

function formatMoney(n: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n)
  } catch {
    return String(n)
  }
}

function statusClass(s: string) {
  if (s === 'accepted') return 'bg-green-100 text-green-800'
  if (s === 'declined' || s === 'expired') return 'bg-red-100 text-red-800'
  if (s === 'sent' || s === 'viewed') return 'bg-sky-100 text-sky-800'
  if (s === 'superseded') return 'bg-surface-100 text-surface-500'
  return 'bg-amber-100 text-amber-800'
}

async function openCreate() {
  createError.value = ''
  form.client = ''
  form.title = ''
  await loadClients()
  showCreate.value = true
}

async function createProposal() {
  creating.value = true
  createError.value = ''
  try {
    const data = await $fetch<{ proposal: { id: string } }>('/api/crm/proposals', {
      method: 'POST',
      headers: authHeaders(),
      body: { client: form.client, title: form.title },
    })
    showCreate.value = false
    await router.push(`/crm/proposals/${data.proposal.id}`)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    createError.value = err?.data?.message ?? err?.message ?? 'Failed to create proposal'
  } finally {
    creating.value = false
  }
}

onMounted(() => load())
watch(statusFilter, () => load(statusFilter.value || undefined))
</script>
