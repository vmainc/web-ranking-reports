<template>
  <div class="rounded-xl border border-surface-200 bg-white shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-surface-100 px-4 py-3">
      <h2 class="text-sm font-semibold text-surface-900">Sites</h2>
      <div class="flex flex-wrap items-center gap-2">
        <label class="text-xs text-surface-500">Filter</label>
        <select
          v-model="filterStatus"
          class="rounded-lg border border-surface-200 bg-white px-2 py-1.5 text-sm text-surface-900"
        >
          <option value="">All</option>
          <option value="trial">trial</option>
          <option value="active">active</option>
          <option value="past_due">past_due</option>
          <option value="canceled">canceled</option>
          <option value="unpaid">unpaid</option>
          <option value="locked">locked</option>
        </select>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-surface-200 text-left text-sm">
        <thead class="bg-surface-50 text-xs font-medium uppercase tracking-wide text-surface-500">
          <tr>
            <th class="px-4 py-3">Site</th>
            <th class="px-4 py-3">Owner email</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Trial ends</th>
            <th class="px-4 py-3">Stripe customer</th>
            <th class="px-4 py-3">Subscription</th>
            <th class="px-4 py-3">Billing</th>
            <th class="px-4 py-3">Created</th>
            <th class="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-100 text-surface-800">
          <tr v-for="row in filteredRows" :key="row.id">
            <td class="px-4 py-3 font-medium text-surface-900">{{ row.siteName }}</td>
            <td class="max-w-[200px] truncate px-4 py-3 text-surface-600">{{ row.ownerEmail || '—' }}</td>
            <td class="px-4 py-3">{{ row.siteStatus }}</td>
            <td class="whitespace-nowrap px-4 py-3 text-surface-600">{{ formatDate(row.trialEnds) }}</td>
            <td class="max-w-[120px] truncate px-4 py-3 font-mono text-xs">{{ row.stripeCustomerId || '—' }}</td>
            <td class="max-w-[120px] truncate px-4 py-3 font-mono text-xs">{{ row.stripeSubscriptionId || '—' }}</td>
            <td class="px-4 py-3">{{ row.billingStatus }}</td>
            <td class="whitespace-nowrap px-4 py-3 text-surface-600">{{ formatDate(row.created) }}</td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-2">
                <a
                  v-if="row.stripeCustomerId"
                  :href="stripeCustomerUrl(row.stripeCustomerId)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary-600 hover:underline"
                >
                  Stripe
                </a>
                <button
                  type="button"
                  class="text-sm font-medium text-surface-700 hover:text-primary-600 disabled:opacity-50"
                  :disabled="refreshingId === row.id || !row.stripeSubscriptionId"
                  @click="$emit('refresh', row.id)"
                >
                  {{ refreshingId === row.id ? '…' : 'Refresh' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!filteredRows.length" class="px-4 py-8 text-center text-sm text-surface-500">No rows match this filter.</p>
  </div>
</template>

<script setup lang="ts">
export type BillingSiteRow = {
  id: string
  siteName: string
  ownerEmail: string
  domain: string
  siteStatus: string
  trialEnds: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  billingStatus: string
  created: string
}

const props = defineProps<{
  sites: BillingSiteRow[]
  refreshingId?: string | null
}>()

defineEmits<{ refresh: [siteId: string] }>()

const filterStatus = ref('')

const filteredRows = computed(() => {
  const f = filterStatus.value.trim().toLowerCase()
  if (!f) return props.sites
  return props.sites.filter((s) => s.billingStatus.toLowerCase() === f)
})

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function stripeCustomerUrl(customerId: string): string {
  const cfg = useRuntimeConfig()
  const key = (cfg.public.stripePublishableKey as string) || ''
  const test = key.startsWith('pk_test_')
  return test
    ? `https://dashboard.stripe.com/test/customers/${customerId}`
    : `https://dashboard.stripe.com/customers/${customerId}`
}
</script>
