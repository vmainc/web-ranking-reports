<template>
  <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
    <NuxtLink to="/dashboard" class="mb-6 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600">
      ← Dashboard
    </NuxtLink>
    <h1 class="text-2xl font-semibold text-surface-900">Billing</h1>
    <p class="mt-1 text-sm text-surface-500">Each site has its own subscription ($19.99/mo after a 14-day trial). No card required during the trial.</p>

    <p v-if="successFlag" class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
      Payment setup received. If the dashboard doesn’t update immediately, wait a few seconds for Stripe to finish syncing.
    </p>

    <div v-if="loading" class="mt-8 text-sm text-surface-500">Loading sites…</div>
    <p v-else-if="loadError" class="mt-8 text-sm text-red-600">{{ loadError }}</p>
    <ul v-else class="mt-8 space-y-4">
      <li
        v-for="s in sites"
        :key="s.id"
        class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-semibold text-surface-900">{{ s.name }}</p>
            <p class="text-sm text-surface-500">{{ s.domain }}</p>
          </div>
          <span class="rounded-full bg-surface-100 px-3 py-1 text-xs font-medium text-surface-700">
            {{ statusLabel(s.id) }}
          </span>
        </div>
        <p v-if="trialLine(s.id)" class="mt-2 text-sm text-amber-800">{{ trialLine(s.id) }}</p>
        <p v-if="role !== 'owner' && role !== 'member'" class="mt-3 text-sm text-surface-600">
          Only the workspace owner can upgrade this site. Ask your agency admin to subscribe.
        </p>
        <div v-else class="mt-4 flex flex-wrap gap-2">
          <button
            v-if="canUpgrade(s.id)"
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="busyId === s.id"
            @click="onUpgrade(s.id)"
          >
            {{ busyId === s.id ? 'Please wait…' : 'Upgrade / subscribe' }}
          </button>
          <button
            v-if="canManage(s.id)"
            type="button"
            class="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-semibold text-surface-800 hover:bg-surface-50 disabled:opacity-50"
            :disabled="busyId === s.id"
            @click="onManage(s.id)"
          >
            Manage billing
          </button>
          <NuxtLink
            :to="`/sites/${s.id}/settings`"
            class="inline-flex items-center rounded-lg border border-surface-200 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
          >
            Site settings
          </NuxtLink>
        </div>
      </li>
    </ul>
    <p v-if="!loading && !sites.length" class="mt-8 text-sm text-surface-500">No sites yet. Create one from the Dashboard or Sites page.</p>
  </div>
</template>

<script setup lang="ts">
import type { Site } from '~/types'

definePageMeta({ layout: 'default' })

const route = useRoute()
const { startCheckout, openBillingPortal, fetchSiteBillingStatus } = useBilling()
const pb = usePocketbase()

const loading = ref(true)
const loadError = ref('')
const sites = ref<Site[]>([])
const role = ref<'owner' | 'member' | 'client'>('owner')
const statusBySite = ref<Record<string, { billing_status: string; trialDaysRemaining: number | null; locked: boolean }>>({})
const busyId = ref<string | null>(null)

const successFlag = computed(() => route.query.success === '1' || route.query.success === 'true')

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadSites() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await $fetch<{ sites: Site[]; role?: 'owner' | 'member' | 'client' }>('/api/workspace/sites', {
      headers: authHeaders(),
    })
    sites.value = res.sites ?? []
    role.value = res.role ?? 'owner'

    const map: Record<string, { billing_status: string; trialDaysRemaining: number | null; locked: boolean }> = {}
    for (const s of sites.value) {
      try {
        const st = await fetchSiteBillingStatus(s.id)
        if (st) {
          map[s.id] = {
            billing_status: st.billing_status,
            trialDaysRemaining: st.trialDaysRemaining,
            locked: st.locked,
          }
        }
      } catch {
        // skip
      }
    }
    statusBySite.value = map
  } catch (e: unknown) {
    const fe = e as { data?: { message?: string }; message?: string }
    loadError.value = fe?.data?.message || fe?.message || 'Could not load sites'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadSites()
})

function statusLabel(siteId: string): string {
  const st = statusBySite.value[siteId]
  if (!st) return '…'
  if (st.locked) return 'Locked — subscription required'
  return st.billing_status || 'active'
}

function trialLine(siteId: string): string {
  const st = statusBySite.value[siteId]
  if (!st || st.locked) return ''
  const d = st.trialDaysRemaining
  if (d == null || d <= 0) return ''
  return `Your free trial ends in ${d} ${d === 1 ? 'day' : 'days'}.`
}

function siteStripeFlags(siteId: string) {
  const site = sites.value.find((x) => x.id === siteId)
  const hasSub = !!(site?.stripe_subscription_id && String(site.stripe_subscription_id).trim())
  const hasCustomer = !!(site?.stripe_customer_id && String(site.stripe_customer_id).trim())
  return { hasSub, hasCustomer }
}

/** Grandfathered “active” sites without Stripe should not see Upgrade. */
function canUpgrade(siteId: string): boolean {
  const st = statusBySite.value[siteId]
  const { hasSub } = siteStripeFlags(siteId)
  if (!st) return true
  if (st.locked) return true
  if (st.billing_status === 'active' && !hasSub) return false
  if (st.billing_status === 'active' || st.billing_status === 'past_due') return false
  return true
}

function canManage(siteId: string): boolean {
  const st = statusBySite.value[siteId]
  const { hasSub, hasCustomer } = siteStripeFlags(siteId)
  if (!st || st.locked) return false
  return hasCustomer && hasSub && (st.billing_status === 'active' || st.billing_status === 'past_due')
}

async function onUpgrade(siteId: string) {
  busyId.value = siteId
  try {
    await startCheckout(siteId)
  } catch (e: unknown) {
    const fe = e as { data?: { message?: string }; message?: string }
    loadError.value = fe?.data?.message || fe?.message || 'Checkout failed'
  } finally {
    busyId.value = null
  }
}

async function onManage(siteId: string) {
  busyId.value = siteId
  try {
    await openBillingPortal(siteId)
  } catch (e: unknown) {
    const fe = e as { data?: { message?: string }; message?: string }
    loadError.value = fe?.data?.message || fe?.message || 'Could not open billing portal'
  } finally {
    busyId.value = null
  }
}
</script>
