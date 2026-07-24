<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-white">CRM</h1>
      <p class="mt-1 text-sm text-slate-400">Leads, contacts, and pipeline at a glance.</p>
    </div>

    <CrmSubNav />

    <div v-if="statsPending" class="py-12 text-center text-sm text-slate-500">Loading…</div>
    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2">
        <NuxtLink
          to="/crm/clients?status=lead"
          class="crm-stat-card crm-stat-card--leads rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-slate-900/50 p-5 shadow-lg ring-1 ring-white/[0.03] transition hover:border-amber-500/50"
        >
          <p class="text-sm font-medium text-amber-300/90">Leads</p>
          <p class="mt-1 text-3xl font-bold tabular-nums text-white">{{ stats.leadsCount }}</p>
        </NuxtLink>
        <NuxtLink
          to="/crm/clients?status=client"
          class="crm-stat-card crm-stat-card--customers rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-slate-900/50 p-5 shadow-lg ring-1 ring-white/[0.03] transition hover:border-emerald-500/50"
        >
          <p class="text-sm font-medium text-emerald-300/90">Customers</p>
          <p class="mt-1 text-3xl font-bold tabular-nums text-white">{{ stats.clientsCount }}</p>
        </NuxtLink>
      </div>

      <section class="crm-panel mt-8 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/50 shadow-lg ring-1 ring-white/[0.03]">
        <h2 class="border-b border-slate-700/60 bg-slate-800/40 px-6 py-4 text-lg font-semibold text-white">Stale leads</h2>
        <p class="px-6 py-2 text-xs text-slate-500">Leads with no activity in the last 7 days.</p>
        <div v-if="!stats.staleLeads.length" class="px-6 py-8 text-center text-sm text-slate-500">None.</div>
        <ul v-else class="divide-y divide-slate-700/50">
          <li v-for="c in stats.staleLeads" :key="c.id" class="flex items-center justify-between px-6 py-3 transition hover:bg-slate-800/40">
            <div>
              <span class="font-medium text-white">{{ c.name }}</span>
              <span v-if="c.company" class="ml-2 text-sm text-slate-400">{{ c.company }}</span>
            </div>
            <NuxtLink :to="`/crm/clients/${c.id}`" class="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline">View</NuxtLink>
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
