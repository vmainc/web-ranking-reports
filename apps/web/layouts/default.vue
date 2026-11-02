<template>
  <div
    :class="[
      'app-shell min-h-screen flex flex-col',
      isDark ? 'dashboard-vibrant bg-[#0f172a]' : 'app-theme-light bg-surface-50',
    ]"
  >
    <header
      :class="[
        'sticky top-0 z-50 backdrop-blur-md print:hidden',
        isDark ? 'border-b border-slate-800/80 bg-slate-950/90' : 'border-b border-surface-200 bg-white/90',
        { hidden: !showHeader },
      ]"
    >
      <GlobalTrialBanner />
      <div class="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div class="flex h-12 items-center justify-between gap-2 sm:h-14">
          <NuxtLink
            :to="logoHome"
            class="app-logo-link flex min-w-0 items-center gap-2 font-semibold text-white transition hover:text-slate-200"
          >
            <img
              v-if="hasCustomAgencyLogo && agencyLogoUrl"
              :src="agencyLogoUrl"
              alt="Agency logo"
              class="h-7 w-auto max-w-[140px] object-contain sm:h-8 sm:max-w-[180px]"
            />
            <template v-else>
              <img src="/images/branding/wrr-logo.svg" alt="WRR logo" class="h-7 w-7 sm:h-8 sm:w-8" />
              <span class="hidden truncate sm:inline">Web Ranking Reports</span>
            </template>
          </NuxtLink>
          <LayoutAppHeaderNav />
        </div>
        <LayoutAppMobileNavPanel />
      </div>
    </header>
    <main class="relative z-0 flex min-h-0 flex-1 flex-col">
      <BillingTrialBanner v-if="billingBannerSiteId" :site-id="billingBannerSiteId" />
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const { isDark } = useAppTheme()

const route = useRoute()
const { isClientUser } = useAuthState()
const { plan, freeOwnerHomePath } = useSubscriptionPlan()

const navReady = useState('app-nav-ready', () => false)
const pb = usePocketbase()
const agencyLogoUrl = ref<string | null>(null)
const agencyName = ref('')
const hasCustomAgencyLogo = ref(false)

/** Avoid SSR/client mismatch: token + user load only in browser. */
onMounted(() => {
  navReady.value = true
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

const showHeader = computed(() => {
  const path = route.path
  if (path === '/auth/login' || path === '/auth/register') return false
  if (path === '/p' || path.startsWith('/p/')) return false
  return true
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
