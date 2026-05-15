<template>
  <div class="dashboard-vibrant app-shell min-h-screen flex flex-col bg-[#0f172a]">
    <header
      :class="[
        'sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md print:hidden',
        { hidden: !showHeader },
      ]"
    >
      <GlobalTrialBanner />
      <div class="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <NuxtLink :to="logoHome" class="flex items-center gap-2 font-semibold text-white transition hover:text-slate-200">
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
        <nav class="flex items-center gap-1 sm:gap-2">
          <NuxtLink
            v-if="navReady && !isClientUser && showPaidWorkspaceNav"
            to="/dashboard"
            class="app-nav-link"
            active-class="app-nav-link--active"
          >
            Dashboard
          </NuxtLink>
          <NuxtLink
            :to="sitesNavTo"
            class="app-nav-link"
            :class="{ 'app-nav-link--active': sitesNavActive }"
          >
            {{ sitesNavLabel }}
          </NuxtLink>
          <NuxtLink
            v-if="navReady && !isClientUser"
            to="/reports"
            class="app-nav-link"
            active-class="app-nav-link--active"
          >
            Reports
          </NuxtLink>
          <NuxtLink
            v-if="navReady && !isClientUser && showPaidWorkspaceNav"
            to="/email"
            class="app-nav-link"
            :class="{ 'app-nav-link--active': route.path.startsWith('/email') }"
          >
            Email
          </NuxtLink>
          <NuxtLink
            v-if="navReady && !isClientUser"
            to="/crm"
            class="app-nav-link"
            active-class="app-nav-link--active"
          >
            CRM
          </NuxtLink>
          <NuxtLink
            v-if="navReady && !isClientUser && showPaidWorkspaceNav"
            to="/agency"
            class="app-nav-link"
            active-class="app-nav-link--active"
          >
            Agency
          </NuxtLink>
          <NuxtLink
            v-if="navReady && isAdminEmail"
            to="/admin/integrations"
            class="app-nav-link"
            :class="{ 'app-nav-link--active': route.path.startsWith('/admin') }"
          >
            Admin
          </NuxtLink>
          <div data-account-menu-root class="ml-1 sm:ml-2">
            <LayoutAccountMenu />
          </div>
        </nav>
      </div>
    </header>
    <main class="relative z-0 flex min-h-0 flex-1 flex-col">
      <BillingTrialBanner v-if="billingBannerSiteId" :site-id="billingBannerSiteId" />
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
useHead({
  htmlAttrs: { class: 'app-dark' },
  bodyAttrs: { class: 'bg-[#0f172a] text-slate-200' },
})

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
