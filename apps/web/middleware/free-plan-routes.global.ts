/**
 * Free-tier workspace owners: Sites, Reports, and CRM only. Dashboard (root), Email, Agency,
 * and other /dashboard/* routes (except billing) require a paid or comped plan.
 */
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

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const pb = usePocketbase()
  if (!pb.authStore.isValid) return
  if (isClientAccount(pb.authStore.model)) return

  const path = normalizePath(to.path)
  if (!pathRequiresPaidWorkspace(path)) return

  const token = String(pb.authStore.token || '').trim()
  if (!token) return

  try {
    const st = await $fetch<{ plan?: string }>('/api/subscriptions/status', {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-WRR-Authorization': `Bearer ${token}`,
      },
    })
    const p = String(st?.plan || '').toLowerCase().trim()
    if (p !== 'free') return
  } catch {
    return
  }

  return navigateTo('/sites', { replace: true })
})
