<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-surface-900">Onboarding</h1>
        <p class="mt-1 text-sm text-surface-500">Client onboarding status. Link clients to a site in their profile to see integration status below.</p>
      </div>
      <NuxtLink to="/crm" class="text-sm font-medium text-surface-600 hover:text-primary-600">← CRM</NuxtLink>
    </div>

    <nav class="mb-6 flex flex-wrap gap-1 border-b border-surface-200">
      <NuxtLink to="/crm" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Dashboard</NuxtLink>
      <NuxtLink to="/crm/clients" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Clients</NuxtLink>
      <NuxtLink to="/crm/pipeline" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Leads</NuxtLink>
      <NuxtLink to="/crm/tasks" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Tasks</NuxtLink>
      <NuxtLink to="/crm/deals" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Proposals</NuxtLink>
      <NuxtLink to="/crm/onboarding" class="border-b-2 border-primary-600 px-4 py-3 text-sm font-medium text-primary-600">Onboarding</NuxtLink>
    </nav>

    <section class="rounded-xl border border-surface-200 bg-white shadow-sm">
      <h2 class="border-b border-surface-200 px-6 py-4 text-lg font-semibold text-surface-900">Clients &amp; integrations</h2>
      <p class="px-6 py-2 text-sm text-surface-500">Same metrics as on each site’s Settings → What’s connected. Connect a client to a site in their profile to see status here.</p>

      <div v-if="pending" class="px-6 py-12 text-center text-surface-500">Loading…</div>
      <div v-else-if="!rows.length" class="px-6 py-12 text-center text-sm text-surface-500">No clients yet. Add clients in CRM and link them to a site to see onboarding status.</div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-surface-200">
          <thead class="bg-surface-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-surface-500">Client</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-surface-500">Site</th>
              <th
                v-for="col in metricColumns"
                :key="col.provider"
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-surface-500 whitespace-nowrap"
              >
                {{ col.label }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-200 bg-white">
            <tr v-for="row in rows" :key="row.client.id" class="hover:bg-surface-50/50">
              <td class="px-4 py-3 text-sm">
                <NuxtLink :to="`/crm/clients/${row.client.id}`" class="font-medium text-primary-600 hover:underline">{{ row.client.name }}</NuxtLink>
                <p v-if="row.client.company" class="mt-0.5 text-xs text-surface-500">{{ row.client.company }}</p>
              </td>
              <td class="px-4 py-3 text-sm">
                <template v-if="row.client.expand?.site">
                  <NuxtLink :to="`/sites/${row.siteId}/settings`" class="text-primary-600 hover:underline">{{ row.client.expand.site.name }}</NuxtLink>
                  <p class="mt-0.5 text-xs text-surface-500">{{ row.client.expand.site.domain }}</p>
                </template>
                <span v-else class="text-surface-400">—</span>
              </td>
              <td
                v-for="col in metricColumns"
                :key="col.provider"
                class="px-4 py-3 text-sm"
              >
                <span
                  v-if="row.siteId"
                  class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="statusClass(getStatus(row, col.provider))"
                >
                  {{ getStatusLabel(getStatus(row, col.provider)) }}
                </span>
                <span v-else class="text-surface-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { IntegrationProvider, IntegrationStatus, OnboardingRow } from '~/types'
import { getStatusLabel } from '~/services/integrations'

definePageMeta({ layout: 'default' })

const pb = usePocketbase()
const rows = ref<OnboardingRow[]>([])
const pending = ref(true)

const metricColumns: { provider: IntegrationProvider; label: string }[] = [
  { provider: 'google_analytics', label: 'Google Analytics' },
  { provider: 'google_search_console', label: 'Search Console' },
  { provider: 'lighthouse', label: 'Lighthouse' },
  { provider: 'google_business_profile', label: 'Business Profile' },
  { provider: 'google_ads', label: 'Google Ads' },
  { provider: 'woocommerce', label: 'WooCommerce' },
  { provider: 'bing_webmaster', label: 'Bing Webmaster' },
]

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function getStatus(row: OnboardingRow, provider: IntegrationProvider): IntegrationStatus {
  const int = row.integrations.find((i) => i.provider === provider)
  return int?.status ?? 'disconnected'
}

function statusClass(status: IntegrationStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-green-100 text-green-800'
    case 'pending':
      return 'bg-amber-100 text-amber-800'
    case 'error':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-surface-100 text-surface-600'
  }
}

async function load() {
  pending.value = true
  try {
    const data = await $fetch<{ rows: OnboardingRow[] }>('/api/crm/onboarding', { headers: authHeaders() })
    rows.value = data.rows ?? []
  } catch {
    rows.value = []
  } finally {
    pending.value = false
  }
}

onMounted(() => load())
</script>
