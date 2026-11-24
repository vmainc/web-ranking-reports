/**
 * Free-tier workspace owners: no app Dashboard, Email, Agency, or Workspace. Paid-only routes redirect to
 * their site workspace (`/sites/{id}`) when they have at least one site, else `/sites`. Visiting
 * `/sites` while free with ≥1 site redirects straight to that site (single-site default).
 */
import { getFreeTierSiteHomeOrSitesListPath } from '~/composables/freeWorkspaceHome'

function normalizePath(path: string): string {
  const base = path.split('?')[0].replace(/\/$/, '')
  return base === '' ? '/' : base
}

function isClientAccount(model: unknown): boolean {
  const u = model as Record<string, unknown> | null | undefined
  return String(u?.account_type ?? '').toLowerCase().trim() === 'client'
}

function pathRequiresPaidWorkspace(path: string): boolean {
  if (path === '/dashboard') return true
  if (path.startsWith('/dashboard/') && !path.startsWith('/dashboard/billing')) return true
  if (path === '/email' || path.startsWith('/email/')) return true
  if (path === '/agency' || path.startsWith('/agency/')) return true
  if (path === '/workspace' || path.startsWith('/workspace/')) return true
  return false
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const { plansEnabled } = usePlansMode()
  if (!plansEnabled.value) return

  const pb = usePocketbase()
  if (!pb.authStore.isValid) return
  if (isClientAccount(pb.authStore.model)) return

  const token = String(pb.authStore.token || '').trim()
  if (!token) return

  const path = normalizePath(to.path)

  const { plan, freeOwnerHomePath, ensurePlanLoaded } = useSubscriptionPlan()
  await ensurePlanLoaded()
  if (plan.value !== 'free') return

  async function freeTierHome(): Promise<string> {
    if (freeOwnerHomePath.value) return freeOwnerHomePath.value
    return getFreeTierSiteHomeOrSitesListPath()
  }

  if (path === '/sites') {
    const home = await freeTierHome()
    if (home !== '/sites') {
      return navigateTo(home, { replace: true })
    }
    return
  }

  if (!pathRequiresPaidWorkspace(path)) return

  const home = await freeTierHome()
  return navigateTo(home, { replace: true })
})
