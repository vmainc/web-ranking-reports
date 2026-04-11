<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <NuxtLink to="/dashboard" class="mb-6 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600">
      ← Dashboard
    </NuxtLink>
    <h1 class="mb-2 text-2xl font-semibold text-surface-900">Billing Admin</h1>
    <p class="mb-6 text-sm text-surface-500">
      Stripe-connected sites, trials, and subscriptions. Only <strong>admin@vma.agency</strong> can access this page.
    </p>

    <AdminNav />

    <div v-if="pending" class="rounded-xl border border-surface-200 bg-white p-6 text-sm text-surface-600">Loading…</div>
    <p v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{{ error }}</p>
    <template v-else-if="data">
      <BillingOverview class="mb-8" :overview="data.overview" />
      <BillingSitesTable :sites="data.sites" :refreshing-id="refreshingId" @refresh="onRefresh" />
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: ['admin-billing'] })

type BillingSiteRow = {
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

type ListResponse = {
  overview: {
    trialSites: number
    activeSubscriptions: number
    pastDue: number
    canceled: number
    mrrEstimateUsd: number
  }
  sites: BillingSiteRow[]
}

const pb = usePocketbase()
const pending = ref(true)
const error = ref('')
const data = ref<ListResponse | null>(null)
const refreshingId = ref<string | null>(null)

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function load() {
  pending.value = true
  error.value = ''
  try {
    data.value = await $fetch<ListResponse>('/api/admin/billing/list', { headers: authHeaders() })
  } catch (e: unknown) {
    const fe = e as { data?: { message?: string }; message?: string }
    error.value = fe?.data?.message || fe?.message || 'Could not load billing data'
    data.value = null
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  void load()
})

async function onRefresh(siteId: string) {
  refreshingId.value = siteId
  try {
    await $fetch('/api/admin/billing/refresh', {
      method: 'POST',
      headers: authHeaders(),
      body: { siteId },
    })
    await load()
  } catch (e: unknown) {
    const fe = e as { data?: { message?: string }; message?: string }
    error.value = fe?.data?.message || fe?.message || 'Refresh failed'
  } finally {
    refreshingId.value = null
  }
}
</script>
