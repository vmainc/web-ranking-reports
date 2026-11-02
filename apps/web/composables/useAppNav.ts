export interface AppNavLink {
  to: string
  label: string
  active: boolean
}

export function useAppNav() {
  const route = useRoute()
  const { isClientUser } = useAuthState()
  const { plan, freeOwnerHomePath, refreshPlan, showPaidWorkspaceNav } = useSubscriptionPlan()
  const pb = usePocketbase()

  const navReady = useState('app-nav-ready', () => false)
  const navInitDone = useState('app-nav-init-done', () => false)
  const mobileNavOpen = useState('app-mobile-nav-open', () => false)

  onMounted(() => {
    navReady.value = true
    if (!navInitDone.value) {
      navInitDone.value = true
      void refreshPlan()
    }
  })

  watch(
    () => route.fullPath,
    () => {
      mobileNavOpen.value = false
    },
  )

  function normalizedPath() {
    return route.path.replace(/\/$/, '') || '/'
  }

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
    const p = normalizedPath()
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

  const isAdminEmail = computed(() => {
    const u = pb.authStore.model as { email?: string } | null
    return !!(u?.email && pb.authStore.token && u.email.toLowerCase().trim() === 'admin@vma.agency')
  })

  function pathMatches(prefix: string) {
    const p = normalizedPath()
    return p === prefix || p.startsWith(`${prefix}/`)
  }

  const navLinks = computed((): AppNavLink[] => {
    if (!navReady.value) return []

    const links: AppNavLink[] = [
      {
        to: sitesNavTo.value,
        label: sitesNavLabel.value,
        active: sitesNavActive.value,
      },
    ]

    if (!isClientUser.value && showPaidWorkspaceNav.value) {
      links.push({
        to: '/dashboard',
        label: 'Dashboard',
        active: pathMatches('/dashboard'),
      })
    }

    if (!isClientUser.value) {
      links.push({
        to: '/reports',
        label: 'Reports',
        active: pathMatches('/reports'),
      })
    }

    if (!isClientUser.value && showPaidWorkspaceNav.value) {
      links.push({
        to: '/email',
        label: 'Email',
        active: pathMatches('/email'),
      })
    }

    if (!isClientUser.value) {
      const p = normalizedPath()
      links.push({
        to: '/crm/clients',
        label: 'CRM',
        active: p === '/crm' || pathMatches('/crm'),
      })
    }

    if (!isClientUser.value && showPaidWorkspaceNav.value) {
      links.push({
        to: '/agency',
        label: 'Agency',
        active: pathMatches('/agency'),
      })
      links.push({
        to: '/workspace',
        label: 'Workspace',
        active: pathMatches('/workspace'),
      })
    }

    if (!isClientUser.value && isAdminEmail.value) {
      links.push({
        to: '/admin/integrations',
        label: 'Admin',
        active: pathMatches('/admin'),
      })
    }

    return links
  })

  function toggleMobileNav() {
    mobileNavOpen.value = !mobileNavOpen.value
  }

  function closeMobileNav() {
    mobileNavOpen.value = false
  }

  return {
    navReady,
    navLinks,
    mobileNavOpen,
    toggleMobileNav,
    closeMobileNav,
    sitesNavTo,
    sitesNavLabel,
    sitesNavActive,
  }
}
