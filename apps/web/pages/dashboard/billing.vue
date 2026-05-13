<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <NuxtLink to="/dashboard" class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600">
      ← Dashboard
    </NuxtLink>
    <h1 class="text-3xl font-bold tracking-tight text-surface-900">Upgrade Web Ranking Reports</h1>
    <p class="mt-1 text-sm text-surface-500">Track more sites, keywords, contacts, and create client-ready reports.</p>

    <p
      v-if="checkoutSuccess"
      class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
    >
      Upgrade successful. Your new limits are now active.
    </p>
    <p
      v-else-if="checkoutCancelled"
      class="mt-4 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-700"
    >
      Checkout cancelled. You can upgrade anytime.
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
        <p class="mt-2 inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-800">
          {{ currentPlanBadge }}
        </p>
      </section>

      <section class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-card">
        <h2 class="text-lg font-semibold text-surface-900">Usage summary</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BillingUsageMeter label="Sites used" :used="status.usage.sites" :limit="status.limits.max_sites" :unlimited="status.plan === 'comped'" />
          <BillingUsageMeter label="Keywords used" :used="status.usage.keywords" :limit="status.limits.max_keywords" :unlimited="status.plan === 'comped'" />
          <BillingUsageMeter label="CRM contacts used" :used="status.usage.contacts" :limit="status.limits.max_contacts" :unlimited="status.plan === 'comped'" />
          <BillingUsageMeter label="Reports this month" :used="status.usage.reports" :limit="status.limits.max_reports_per_month" :unlimited="status.plan === 'comped'" />
        </div>
      </section>

      <section class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-card">
        <h2 class="text-lg font-semibold text-surface-900">Plans</h2>
        <p class="mt-1 text-sm text-surface-500">Cancel anytime. Billing handled securely by Stripe.</p>
        <p
          v-if="trialNotice"
          class="mt-2 rounded-lg border px-3 py-2 text-sm"
          :class="status.trial_expired ? 'border-red-200 bg-red-50 text-red-800' : 'border-sky-200 bg-sky-50 text-sky-800'"
        >
          {{ trialNotice }}
        </p>
        <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <BillingPricingCard
            title="Free"
            price="$0"
            subtitle="Good for getting started"
            :features="[
              '1 site',
              '5 keywords',
              '10 CRM contacts',
              '1 WRR-branded report/month',
              'GA4, Search Console, Google Ads basics',
            ]"
            cta="Free plan"
            :is-current="status.plan === 'free'"
            :action-disabled="status.plan !== 'free' && status.plan !== 'comped'"
            note="Free reports include Web Ranking Reports branding."
          />
          <BillingPricingCard
            title="Starter"
            price="$19.99/mo"
            subtitle="Best for Solo Sites"
            :features="[
              '1 site',
              '25 keywords',
              '100 CRM contacts',
              '10 reports/month',
              'Remove WRR branding',
              'Weekly reports + core integrations',
            ]"
            cta="Upgrade to Starter"
            :is-current="status.plan === 'starter'"
            :busy="busy"
            ribbon="Best for Solo Sites"
            @upgrade="upgrade('starter')"
          />
          <BillingPricingCard
            title="Growth"
            price="$49/mo"
            subtitle="Most Popular"
            :features="[
              '3 sites',
              '100 keywords',
              '500 CRM contacts',
              '50 reports/month',
              'Custom branding + scheduled reports',
              'Cloudflare integration + priority sync',
            ]"
            cta="Upgrade to Growth"
            :is-current="status.plan === 'growth'"
            :busy="busy"
            :highlighted="true"
            ribbon="Most Popular"
            @upgrade="upgrade('growth')"
          />
          <BillingPricingCard
            title="Agency"
            price="$99/mo"
            subtitle="Best for Client Reporting"
            :features="[
              '10 sites',
              '500 keywords',
              '2,000 CRM contacts',
              '200 reports/month',
              'White-label reports + client-ready exports',
              'Agency dashboard at scale',
            ]"
            cta="Upgrade to Agency"
            :is-current="status.plan === 'agency' || status.plan === 'comped'"
            :busy="busy"
            ribbon="Best for Client Reporting"
            @upgrade="upgrade('agency')"
          />
        </div>
        <button
          v-if="status.plan !== 'free' && status.plan !== 'comped'"
          type="button"
          class="mt-4 rounded-lg border border-surface-200 px-4 py-2 text-sm font-semibold text-surface-800 hover:bg-surface-50 disabled:opacity-50"
          :disabled="busy"
          @click="openPortal"
        >
          Manage Billing
        </button>
        <p class="mt-4 text-sm text-surface-600">
          Need more sites or keywords? Agency plan is built for scaling client reporting.
        </p>
      </section>

      <BillingUpgradeLimitModal
        :open="showUpgradeModal"
        title="Upgrade to continue"
        :message="upgradeModalMessage"
        @close="showUpgradeModal = false"
        @upgrade="upgrade('growth')"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

type PaidPlan = 'starter' | 'growth' | 'agency'

const route = useRoute()
const router = useRouter()
const pb = usePocketbase()
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const status = ref<null | {
  plan: 'free' | 'starter' | 'growth' | 'agency' | 'comped'
  status: string
  stripe_customer_id: string | null
  current_period_end: string | null
  is_trial: boolean
  trial_days_left: number
  trial_end: string | null
  trial_expired: boolean
  usage: { sites: number; keywords: number; contacts: number; reports: number }
  limits: { max_sites: number; max_keywords: number; max_contacts: number; max_reports_per_month: number }
}>(null)

const checkoutSuccess = computed(() => route.query.checkout === 'success' || route.query.success === '1' || route.query.success === 'true')
const checkoutCancelled = computed(() => route.query.checkout === 'cancelled')
const selectedPlan = computed<PaidPlan | ''>(() => {
  const raw = String(route.query.plan || '').toLowerCase().trim()
  if (raw === 'starter' || raw === 'growth' || raw === 'agency') return raw
  return ''
})
const autoStartCheckout = computed(() => route.query.autostart === '1')
const showUpgradeModal = ref(false)
const upgradeModalMessage = ref(
  'You’ve reached the limit for your current plan. Upgrade to continue.',
)
const autoStarted = ref(false)
const subscriptionsStatusMissing = useState<boolean>('subscriptions-status-missing', () => false)

const currentPlanBadge = computed(() => {
  if (!status.value) return ''
  if (status.value.plan === 'free') return 'WRR-branded reports on free plan'
  if (status.value.plan === 'comped') return 'Comped account: full access enabled at no cost'
  if (status.value.plan === 'starter') return 'Paid plan: unbranded reports enabled'
  if (status.value.plan === 'growth') return 'Paid plan: custom branding + scheduled reports'
  return 'Paid plan: white-label reports enabled'
})
const trialNotice = computed(() => {
  if (!status.value) return ''
  if (status.value.trial_expired && status.value.plan === 'free') {
    return 'Your trial has ended. Upgrade to keep your data, reports, and keyword tracking active.'
  }
  if (status.value.is_trial && status.value.trial_days_left > 0) {
    const paid = status.value.plan !== 'free' && status.value.plan !== 'comped'
    if (paid) {
      return `Your ${prettyPlan(status.value.plan)} trial ends in ${status.value.trial_days_left} day${status.value.trial_days_left === 1 ? '' : 's'}.`
    }
    return `Your trial ends in ${status.value.trial_days_left} day${status.value.trial_days_left === 1 ? '' : 's'}.`
  }
  return ''
})

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  if (!token) return {}
  // Duplicate token: rare intermediaries strip Authorization on POST; server reads X-WRR-Authorization too.
  return { Authorization: `Bearer ${token}`, 'X-WRR-Authorization': `Bearer ${token}` }
}

async function redirectToLogin() {
  const next = typeof route.fullPath === 'string' && route.fullPath ? route.fullPath : '/dashboard/billing'
  await router.push({ path: '/auth/login', query: { next } })
}

/** After a 401 from our API, PocketBase may still look "valid" client-side — auth middleware would bounce /auth/login → /dashboard. */
async function redirectToLoginClearingSession() {
  pb.authStore.clear()
  await redirectToLogin()
}

async function ensureSession(plan?: PaidPlan): Promise<boolean> {
  const token = String(pb.authStore.token || '').trim()
  if (!token) {
    const next = '/dashboard/billing'
    await router.push({
      path: '/auth/login',
      query: {
        ...(plan ? { plan } : {}),
        next,
      },
    })
    return false
  }
  try {
    await pb.collection('users').authRefresh()
    return true
  } catch {
    pb.authStore.clear()
    const next = '/dashboard/billing'
    await router.push({
      path: '/auth/login',
      query: {
        ...(plan ? { plan } : {}),
        next,
      },
    })
    return false
  }
}

function prettyPlan(plan: string): string {
  if (plan === 'comped') return 'Comped'
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
  if (!(await ensureSession())) {
    error.value = 'Your session expired. Please log in again.'
    loading.value = false
    return
  }
  if (subscriptionsStatusMissing.value) {
    status.value = null
    error.value = 'Billing status endpoint is unavailable on this deployment.'
    loading.value = false
    return
  }
  try {
    status.value = await $fetch('/api/subscriptions/status', { headers: authHeaders() })
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    const code = (e as { status?: number; statusCode?: number }).statusCode ?? (e as { status?: number; statusCode?: number }).status
    if (code === 401) {
      error.value = 'Your session expired. Please log in again.'
      await redirectToLoginClearingSession()
      return
    }
    if (code === 404) subscriptionsStatusMissing.value = true
    error.value = err?.data?.message ?? err?.message ?? 'Could not load billing status.'
  } finally {
    loading.value = false
  }
}

async function upgrade(plan: PaidPlan) {
  busy.value = true
  error.value = ''
  if (!(await ensureSession(plan))) {
    error.value = 'Your session expired. Please log in again.'
    busy.value = false
    return
  }
  const postCheckout = () => {
    const token = String(pb.authStore.token || '').trim()
    return $fetch<{ url: string }>('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: authHeaders(),
      body: { plan, pbClientToken: token },
    })
  }
  try {
    const res = await postCheckout()
    if (typeof window !== 'undefined' && res.url) window.location.href = res.url
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    const code = (e as { status?: number; statusCode?: number }).statusCode ?? (e as { status?: number; statusCode?: number }).status
    if (code === 401) {
      try {
        await pb.collection('users').authRefresh()
        const res = await postCheckout()
        if (typeof window !== 'undefined' && res.url) {
          window.location.href = res.url
          return
        }
      } catch {
        // fall through to logout
      }
      error.value = 'Your session expired. Please log in again.'
      await redirectToLoginClearingSession()
      return
    }
    const msg = err?.data?.message ?? err?.message ?? 'Checkout failed.'
    error.value = msg
    if (/limit|upgrade/i.test(msg)) {
      upgradeModalMessage.value = msg
      showUpgradeModal.value = true
    }
  } finally {
    busy.value = false
  }
}

async function openPortal() {
  busy.value = true
  error.value = ''
  if (!(await ensureSession())) {
    error.value = 'Your session expired. Please log in again.'
    busy.value = false
    return
  }
  const postPortal = () => {
    const token = String(pb.authStore.token || '').trim()
    return $fetch<{ url: string }>('/api/stripe/create-portal-session', {
      method: 'POST',
      headers: authHeaders(),
      body: { pbClientToken: token },
    })
  }
  try {
    const res = await postPortal()
    if (typeof window !== 'undefined' && res.url) window.location.href = res.url
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    const code = (e as { status?: number; statusCode?: number }).statusCode ?? (e as { status?: number; statusCode?: number }).status
    if (code === 401) {
      try {
        await pb.collection('users').authRefresh()
        const res = await postPortal()
        if (typeof window !== 'undefined' && res.url) {
          window.location.href = res.url
          return
        }
      } catch {
        // fall through
      }
      error.value = 'Your session expired. Please log in again.'
      await redirectToLoginClearingSession()
      return
    }
    error.value = err?.data?.message ?? err?.message ?? 'Could not open Stripe billing portal.'
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  void loadStatus()
})

watch(
  [status, selectedPlan, autoStartCheckout, busy],
  async () => {
    if (autoStarted.value || !status.value || busy.value) return
    const plan = selectedPlan.value
    if (!plan || !autoStartCheckout.value || status.value.plan === plan) return
    autoStarted.value = true
    await upgrade(plan)
  },
  { immediate: true },
)
</script>

