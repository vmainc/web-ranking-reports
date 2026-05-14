/**
 * Free-tier workspace owners: no app Dashboard, Email, or Agency. Paid-only routes redirect to
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
  return false
}

async function isWorkspaceOnFreePlan(token: string): Promise<boolean> {
  try {
    const st = await $fetch<{ plan?: string }>('/api/subscriptions/status', {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-WRR-Authorization': `Bearer ${token}`,
      },
    })
    return String(st?.plan || '').toLowerCase().trim() === 'free'
  } catch {
    return false
  }
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const pb = usePocketbase()
  if (!pb.authStore.isValid) return
  if (isClientAccount(pb.authStore.model)) return

  const token = String(pb.authStore.token || '').trim()
  if (!token) return

  const path = normalizePath(to.path)

  const free = await isWorkspaceOnFreePlan(token)
  if (!free) return

  if (path === '/sites') {
    const home = await getFreeTierSiteHomeOrSitesListPath()
    if (home !== '/sites') {
      return navigateTo(home, { replace: true })
    }
    return
  }

  if (!pathRequiresPaidWorkspace(path)) return

  const home = await getFreeTierSiteHomeOrSitesListPath()
  return navigateTo(home, { replace: true })
})
