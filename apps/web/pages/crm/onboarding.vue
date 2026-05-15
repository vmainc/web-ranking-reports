<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-white">Onboarding</h1>
      <p class="mt-1 text-sm text-slate-400">
        Contacts marked <strong class="text-emerald-300">Customer</strong> with a linked site: see integration status at a glance. Link or change the site on each
        <NuxtLink to="/crm/clients" class="font-medium text-blue-400 hover:text-blue-300 hover:underline">contact</NuxtLink>.
      </p>
    </div>

    <CrmSubNav />

    <div v-if="pending" class="py-12 text-center text-sm text-surface-500">Loading…</div>
    <div v-else-if="loadError" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{{ loadError }}</div>
    <div v-else-if="!rows.length" class="rounded-xl border border-surface-200 bg-white px-6 py-12 text-center shadow-sm">
      <p class="text-sm text-surface-600">No customers in onboarding yet.</p>
      <p class="mt-2 text-sm text-surface-500">
        Mark contacts as <strong>Customer</strong> and connect a site on their profile to appear here.
      </p>
      <NuxtLink to="/crm/clients?status=client" class="mt-4 inline-block text-sm font-medium text-primary-600 hover:underline">View contacts</NuxtLink>
    </div>
    <div v-else class="overflow-x-auto rounded-xl border border-surface-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-surface-200 text-left text-sm">
        <thead class="bg-surface-50 text-xs font-semibold uppercase tracking-wide text-surface-500">
          <tr>
            <th class="px-4 py-3 sm:px-6">Contact</th>
            <th class="px-4 py-3 sm:px-6">Site</th>
            <th class="px-4 py-3 sm:px-6">Integrations</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-100">
          <tr v-for="row in rows" :key="row.client.id" class="align-top">
            <td class="px-4 py-4 sm:px-6">
              <NuxtLink :to="`/crm/clients/${row.client.id}`" class="font-medium text-primary-600 hover:underline">
                {{ row.client.name }}
              </NuxtLink>
              <p v-if="row.client.company" class="text-xs text-surface-500">{{ row.client.company }}</p>
              <p v-if="row.client.email" class="text-xs text-surface-500">{{ row.client.email }}</p>
            </td>
            <td class="px-4 py-4 sm:px-6">
              <template v-if="row.siteId && row.client.expand?.site">
                <NuxtLink :to="`/sites/${row.siteId}`" class="font-medium text-primary-600 hover:underline">
                  {{ row.client.expand.site.name || row.client.expand.site.domain }}
                </NuxtLink>
                <p class="text-xs text-surface-500">{{ row.client.expand.site.domain }}</p>
              </template>
              <template v-else-if="row.siteId">
                <NuxtLink :to="`/sites/${row.siteId}`" class="text-primary-600 hover:underline">{{ row.siteId }}</NuxtLink>
              </template>
              <span v-else class="text-surface-500">No site linked</span>
            </td>
            <td class="px-4 py-4 sm:px-6">
              <div v-if="!row.siteId" class="text-surface-500">—</div>
              <div v-else-if="!row.integrations.length" class="flex flex-col gap-2">
                <span class="text-surface-500">None yet</span>
                <NuxtLink :to="`/sites/${row.siteId}/setup`" class="text-xs font-medium text-primary-600 hover:underline">Open site setup</NuxtLink>
              </div>
              <ul v-else class="flex flex-col gap-1.5">
                <li
                  v-for="int in row.integrations"
                  :key="int.provider"
                  class="flex flex-wrap items-center gap-2"
                >
                  <span class="text-surface-800">{{ providerLabel(int.provider) }}</span>
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                    :class="integrationStatusClass(int.status)"
                  >
                    {{ int.status }}
                  </span>
                </li>
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IntegrationProvider, IntegrationStatus, OnboardingRow } from '~/types'

definePageMeta({ layout: 'default' })

const rows = ref<OnboardingRow[]>([])
const pending = ref(true)
const loadError = ref('')

function authHeaders(): Record<string, string> {
  const pb = usePocketbase()
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function providerLabel(p: IntegrationProvider): string {
  const labels: Record<IntegrationProvider, string> = {
    google_analytics: 'Google Analytics',
    google_search_console: 'Search Console',
    lighthouse: 'Lighthouse',
    google_business_profile: 'Google Business Profile',
    google_ads: 'Google Ads',
    google_local_services_ads: 'Google Local Service Ads',
    google_calendar: 'Google Calendar',
    woocommerce: 'WooCommerce',
    bing_webmaster: 'Bing Webmaster',
    cloudflare: 'Cloudflare',
  }
  return labels[p] ?? p
}

function integrationStatusClass(s: IntegrationStatus): string {
  const m: Record<IntegrationStatus, string> = {
    connected: 'bg-green-100 text-green-800',
    pending: 'bg-amber-100 text-amber-800',
    error: 'bg-red-100 text-red-800',
    disconnected: 'bg-surface-100 text-surface-600',
  }
  return m[s] ?? m.disconnected
}

onMounted(async () => {
  loadError.value = ''
  try {
    const data = await $fetch<{ rows?: OnboardingRow[] }>('/api/crm/onboarding', { headers: authHeaders() })
    rows.value = data.rows ?? []
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    loadError.value = err?.data?.message ?? err?.message ?? 'Failed to load onboarding.'
    rows.value = []
  } finally {
    pending.value = false
  }
})
</script>
