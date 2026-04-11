<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div class="mb-8">
      <h1 class="text-2xl font-semibold text-surface-900">CRM</h1>
      <p class="mt-1 text-sm text-surface-500">Leads and contacts.</p>
    </div>

    <nav class="mb-8 flex flex-wrap gap-1 border-b border-surface-200">
      <NuxtLink to="/crm" class="border-b-2 border-primary-600 px-4 py-3 text-sm font-medium text-primary-600">Dashboard</NuxtLink>
      <NuxtLink to="/crm/clients" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Contacts</NuxtLink>
      <NuxtLink to="/crm/pipeline" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Leads</NuxtLink>
      <NuxtLink to="/crm/onboarding" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Onboarding</NuxtLink>
      <NuxtLink to="/crm/email" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Email campaigns</NuxtLink>
    </nav>

    <div v-if="statsPending" class="py-12 text-center text-sm text-surface-500">Loading…</div>
    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <NuxtLink to="/crm/clients?status=lead" class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:shadow">
          <p class="text-sm font-medium text-surface-500">Leads</p>
          <p class="mt-1 text-2xl font-bold text-surface-900">{{ stats.leadsCount }}</p>
        </NuxtLink>
        <NuxtLink to="/crm/clients?status=client" class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:shadow">
          <p class="text-sm font-medium text-surface-500">Contacts</p>
          <p class="mt-1 text-2xl font-bold text-surface-900">{{ stats.clientsCount }}</p>
        </NuxtLink>
      </div>

      <section class="mt-8 rounded-xl border border-surface-200 bg-white shadow-sm">
        <h2 class="border-b border-surface-200 px-6 py-4 text-lg font-semibold text-surface-900">Stale leads</h2>
        <p class="px-6 py-2 text-xs text-surface-500">Leads with no activity in the last 7 days.</p>
        <div v-if="!stats.staleLeads.length" class="px-6 py-8 text-center text-sm text-surface-500">None.</div>
        <ul v-else class="divide-y divide-surface-200">
          <li v-for="c in stats.staleLeads" :key="c.id" class="flex items-center justify-between px-6 py-3">
            <div>
              <span class="font-medium text-surface-900">{{ c.name }}</span>
              <span v-if="c.company" class="ml-2 text-sm text-surface-500">{{ c.company }}</span>
            </div>
            <NuxtLink :to="`/crm/clients/${c.id}`" class="text-sm font-medium text-primary-600 hover:underline">View</NuxtLink>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { CrmClient } from '~/types'

definePageMeta({ layout: 'default' })

const stats = reactive({
  leadsCount: 0,
  clientsCount: 0,
  staleLeads: [] as CrmClient[],
})
const statsPending = ref(true)

function authHeaders(): Record<string, string> {
  const pb = usePocketbase()
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

onMounted(async () => {
  try {
    const data = await $fetch<{
      leadsCount?: number
      clientsCount?: number
      staleLeads?: CrmClient[]
    }>('/api/crm/stats', { headers: authHeaders() })
    stats.leadsCount = data.leadsCount ?? 0
    stats.clientsCount = data.clientsCount ?? 0
    stats.staleLeads = data.staleLeads ?? []
  } catch {
    stats.leadsCount = 0
    stats.clientsCount = 0
    stats.staleLeads = []
  } finally {
    statsPending.value = false
  }
})
</script>
