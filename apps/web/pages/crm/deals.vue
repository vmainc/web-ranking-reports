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
      <NuxtLink to="/crm/pipeline" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Pipeline</NuxtLink>
      <NuxtLink to="/crm/tasks" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Tasks</NuxtLink>
      <NuxtLink to="/crm/deals" class="border-b-2 border-primary-600 px-4 py-3 text-sm font-medium text-primary-600">Proposals</NuxtLink>
    </nav>

    <div class="mb-4 flex gap-2">
      <select v-model="statusFilter" class="rounded-lg border border-surface-300 px-3 py-2 text-sm" @change="load(statusFilter)">
        <option value="">All</option>
        <option value="open">Open</option>
        <option value="won">Won</option>
        <option value="lost">Lost</option>
      </select>
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
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const statusFilter = ref('')
const { sales, pending, load } = useCrmSales()

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
