<template>
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <NuxtLink to="/dashboard" class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600">
      ← Dashboard
    </NuxtLink>
    <h1 class="text-2xl font-semibold text-surface-900">Billing</h1>
    <p class="mt-1 text-sm text-surface-500">Manage your subscription, limits, and usage.</p>

    <p
      v-if="successFlag"
      class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
    >
      Subscription update received. If plan details do not refresh immediately, wait a few seconds.
    </p>

    <div v-if="loading" class="mt-8 text-sm text-surface-500">Loading subscription…</div>
    <p v-else-if="error" class="mt-8 text-sm text-red-600">{{ error }}</p>
    <template v-else-if="status">
      <section class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-card">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-surface-500">Current plan</p>
            <p class="mt-1 text-2xl font-bold text-surface-900">{{ prettyPlan(status.plan) }}</p>
          </div>
          <span class="rounded-full bg-surface-100 px-3 py-1 text-xs font-medium text-surface-700">
            {{ status.status }}
          </span>
        </div>
        <p v-if="status.current_period_end" class="mt-3 text-sm text-surface-500">
          Current period ends {{ formatDate(status.current_period_end) }}.
        </p>
      </section>

      <section class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-card">
        <h2 class="text-lg font-semibold text-surface-900">Usage</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-lg border border-surface-200 p-3">
            <p class="text-xs uppercase tracking-wide text-surface-500">Sites</p>
            <p class="mt-1 text-lg font-semibold text-surface-900">{{ status.usage.sites }} / {{ status.limits.max_sites }}</p>
          </div>
          <div class="rounded-lg border border-surface-200 p-3">
            <p class="text-xs uppercase tracking-wide text-surface-500">Keywords</p>
            <p class="mt-1 text-lg font-semibold text-surface-900">{{ status.usage.keywords }} / {{ status.limits.max_keywords }}</p>
          </div>
          <div class="rounded-lg border border-surface-200 p-3">
            <p class="text-xs uppercase tracking-wide text-surface-500">Contacts</p>
            <p class="mt-1 text-lg font-semibold text-surface-900">{{ status.usage.contacts }} / {{ status.limits.max_contacts }}</p>
          </div>
          <div class="rounded-lg border border-surface-200 p-3">
            <p class="text-xs uppercase tracking-wide text-surface-500">Reports / month</p>
            <p class="mt-1 text-lg font-semibold text-surface-900">{{ status.usage.reports }} / {{ status.limits.max_reports_per_month }}</p>
          </div>
        </div>
      </section>

      <section class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-card">
        <h2 class="text-lg font-semibold text-surface-900">Upgrade</h2>
        <p class="mt-1 text-sm text-surface-500">All paid plans include a 14-day free trial.</p>
        <div class="mt-4 grid gap-4 sm:grid-cols-3">
          <div
            v-for="plan in paidPlans"
            :key="plan.id"
            class="rounded-lg border border-surface-200 p-4"
            :class="status.plan === plan.id ? 'ring-2 ring-primary-300' : ''"
          >
            <p class="text-sm font-semibold text-surface-900">{{ plan.label }}</p>
            <p class="mt-1 text-xs text-surface-500">{{ plan.price }}</p>
            <button
              type="button"
              class="mt-3 w-full rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
              :disabled="busy || status.plan === plan.id"
              @click="upgrade(plan.id)"
            >
              {{ status.plan === plan.id ? 'Current plan' : busy ? 'Redirecting…' : `Upgrade to ${plan.label}` }}
            </button>
          </div>
        </div>
        <button
          v-if="status.stripe_customer_id"
          type="button"
          class="mt-4 rounded-lg border border-surface-200 px-4 py-2 text-sm font-semibold text-surface-800 hover:bg-surface-50 disabled:opacity-50"
          :disabled="busy"
          @click="openPortal"
        >
          Manage billing in Stripe
        </button>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

type PaidPlan = 'starter' | 'growth' | 'agency'

const route = useRoute()
const pb = usePocketbase()
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const status = ref<null | {
  plan: 'free' | 'starter' | 'growth' | 'agency'
  status: string
  stripe_customer_id: string | null
  current_period_end: string | null
  usage: { sites: number; keywords: number; contacts: number; reports: number }
  limits: { max_sites: number; max_keywords: number; max_contacts: number; max_reports_per_month: number }
}>(null)

const paidPlans: Array<{ id: PaidPlan; label: string; price: string }> = [
  { id: 'starter', label: 'Starter', price: '$19.99 / month' },
  { id: 'growth', label: 'Growth', price: '$49 / month' },
  { id: 'agency', label: 'Agency', price: '$99 / month' },
]

const successFlag = computed(() => route.query.success === '1' || route.query.success === 'true')

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function prettyPlan(plan: string): string {
  return plan ? `${plan[0].toUpperCase()}${plan.slice(1)}` : 'Free'
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

async function loadStatus() {
  loading.value = true
  error.value = ''
  try {
    status.value = await $fetch('/api/subscriptions/status', { headers: authHeaders() })
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Could not load billing status.'
  } finally {
    loading.value = false
  }
}

async function upgrade(plan: PaidPlan) {
  busy.value = true
  error.value = ''
  try {
    const res = await $fetch<{ url: string }>('/api/subscriptions/create-checkout', {
      method: 'POST',
      headers: authHeaders(),
      body: { plan },
    })
    if (typeof window !== 'undefined' && res.url) window.location.href = res.url
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Checkout failed.'
  } finally {
    busy.value = false
  }
}

async function openPortal() {
  busy.value = true
  error.value = ''
  try {
    const res = await $fetch<{ url: string }>('/api/subscriptions/create-portal', {
      method: 'POST',
      headers: authHeaders(),
    })
    if (typeof window !== 'undefined' && res.url) window.location.href = res.url
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Could not open Stripe billing portal.'
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  void loadStatus()
})
</script>

