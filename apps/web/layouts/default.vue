<template>
  <div class="min-h-screen flex flex-col bg-surface-50">
    <header
      :class="[
        'sticky top-0 z-10 border-b border-surface-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 print:hidden',
        { 'hidden': !showHeader }
      ]"
    >
      <GlobalTrialBanner />
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <NuxtLink :to="logoHome" class="flex items-center gap-2 font-semibold text-surface-900">
          <img
            v-if="hasCustomAgencyLogo && agencyLogoUrl"
            :src="agencyLogoUrl"
            alt="Agency logo"
            class="h-8 w-auto max-w-[180px] object-contain"
          />
          <template v-else>
            <img src="/images/branding/wrr-logo.svg" alt="WRR logo" class="h-8 w-8" />
            <span class="hidden sm:inline">Web Ranking Reports</span>
          </template>
        </NuxtLink>
        <nav class="flex items-center gap-4">
          <NuxtLink
            v-if="navReady && !isClientUser && showPaidWorkspaceNav"
            to="/dashboard"
            class="text-sm font-medium text-surface-600 transition hover:text-primary-600"
            active-class="text-primary-600"
          >
            Dashboard
          </NuxtLink>
          <NuxtLink
            :to="sitesNavTo"
            class="text-sm font-medium transition hover:text-primary-600"
            :class="sitesNavActive ? 'text-primary-600' : 'text-surface-600'"
          >
            {{ sitesNavLabel }}
          </NuxtLink>
          <NuxtLink
            v-if="navReady && !isClientUser"
            to="/reports"
            class="text-sm font-medium text-surface-600 transition hover:text-primary-600"
            active-class="text-primary-600"
          >
            Reports
          </NuxtLink>
          <NuxtLink
            v-if="navReady && !isClientUser && showPaidWorkspaceNav"
            to="/email"
            class="text-sm font-medium transition hover:text-primary-600"
            :class="route.path.startsWith('/email') ? 'text-primary-600' : 'text-surface-600'"
          >
            Email
          </NuxtLink>
          <NuxtLink
            v-if="navReady && !isClientUser"
            to="/crm"
            class="text-sm font-medium text-surface-600 transition hover:text-primary-600"
            active-class="text-primary-600"
          >
            CRM
          </NuxtLink>
          <NuxtLink
            v-if="navReady && !isClientUser && showPaidWorkspaceNav"
            to="/agency"
            class="text-sm font-medium text-surface-600 transition hover:text-primary-600"
            active-class="text-primary-600"
          >
            Agency
          </NuxtLink>
          <NuxtLink
            v-if="navReady && isAdminEmail"
            to="/admin/integrations"
            class="text-sm font-medium transition hover:text-primary-600"
            :class="route.path.startsWith('/admin') ? 'text-primary-600 font-medium' : 'text-surface-600'"
          >
            Admin
          </NuxtLink>
          <div data-account-menu-root>
            <LayoutAccountMenu />
          </div>
        </nav>
      </div>
    </header>
    <main class="flex min-h-0 flex-1 flex-col">
      <BillingTrialBanner v-if="billingBannerSiteId" :site-id="billingBannerSiteId" />
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { user, isClientUser } = useAuthState()
const { plan, freeOwnerHomePath, refreshPlan, showPaidWorkspaceNav } = useSubscriptionPlan()

/** Free / Starter: one site label + deep link; Growth+ owners / clients: sites list. */
const sitesNavLabel = computed(() => {
  if (isClientUser.value) return 'Sites'
  if (plan.value === 'free' || plan.value === 'starter') return 'My Site'
  return 'Sites'
})

const sitesNavTo = computed(() => {
  if (isClientUser.value) return '/sites'
  if (plan.value === 'free' || plan.value === 'starter') return freeOwnerHomePath.value || '/sites'
  return '/sites'
})

const sitesNavActive = computed(() => {
  const p = route.path.replace(/\/$/, '') || '/'
  if (isClientUser.value) {
    return p === '/sites' || p.startsWith('/sites/')
  }
  if (plan.value === 'free' || plan.value === 'starter') {
    const home = freeOwnerHomePath.value || '/sites'
    if (home !== '/sites') {
      return p === home || p.startsWith(`${home}/`)
    }
    return p === '/sites'
  }
  return p === '/sites' || p.startsWith('/sites/')
})
const pb = usePocketbase()
const agencyLogoUrl = ref<string | null>(null)
const agencyName = ref('')
const hasCustomAgencyLogo = ref(false)

/** Avoid SSR/client mismatch: token + user load only in browser. */
const navReady = ref(false)
onMounted(() => {
  navReady.value = true
  void refreshPlan()
  void loadAgencyBranding()
})

onBeforeUnmount(() => {
  if (agencyLogoUrl.value) {
    URL.revokeObjectURL(agencyLogoUrl.value)
    agencyLogoUrl.value = null
  }
})

async function loadAgencyBranding() {
  const headers = pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}
  try {
    const res = await $fetch<{ name?: string; hasCustomLogo?: boolean }>('/api/agency/branding', { headers })
    agencyName.value = typeof res?.name === 'string' ? res.name.trim() : ''
    hasCustomAgencyLogo.value = !!res?.hasCustomLogo
  } catch {
    agencyName.value = ''
    hasCustomAgencyLogo.value = false
  }
  if (!hasCustomAgencyLogo.value) return
  try {
    if (agencyLogoUrl.value) {
      URL.revokeObjectURL(agencyLogoUrl.value)
      agencyLogoUrl.value = null
    }
    const blob = await $fetch<Blob>('/api/agency/logo', { headers, responseType: 'blob' })
    if (blob?.size) agencyLogoUrl.value = URL.createObjectURL(blob)
  } catch {
    agencyLogoUrl.value = null
  }
}

/** Match SSR (nav not ready) so first client paint matches server; then reflect client role and plan. */
const logoHome = computed(() => {
  if (!navReady.value) return '/dashboard'
  if (isClientUser.value) return '/sites'
  if (plan.value === 'free' || plan.value === 'starter') return freeOwnerHomePath.value || '/sites'
  return '/dashboard'
})

const isAdminEmail = computed(() => {
  const u = user.value as { email?: string } | null
  return !!(u?.email && pb.authStore.token && u.email.toLowerCase().trim() === 'admin@vma.agency')
})

const showHeader = computed(() => {
  const path = route.path
  return path !== '/auth/login' && path !== '/auth/register'
})

/** Show trial reminder on site workspace routes (not on site Settings). */
const billingBannerSiteId = computed(() => {
  const path = route.path.replace(/\/$/, '') || '/'
  const m = path.match(/^\/sites\/([^/]+)(?:\/(.*))?$/u)
  if (!m) return ''
  const rest = (m[2] || '').split('?')[0]
  if (rest === 'settings') return ''
  const id = m[1]
  if (!id || id === 'new') return ''
  return id
})
</script>
