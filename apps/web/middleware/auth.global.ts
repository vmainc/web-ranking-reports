function normalizePath(path: string): string {
  const base = path.split('?')[0].replace(/\/$/, '')
  return base === '' ? '/' : base
}

/** Marketing and legal-style pages that do not require a session. */
const publicMarketingPaths = new Set(['/', '/pricing', '/features', '/about', '/contact'])

export default defineNuxtRouteMiddleware((to) => {
  const pb = usePocketbase()
  const isAuth = pb.authStore.isValid
  const path = normalizePath(to.path)
  const isPublicMarketing = publicMarketingPaths.has(path)

  /** Unauthenticated users must reach these without being bounced to login (invite link, reset, forgot). */
  const publicAuthPaths = new Set([
    '/auth/login',
    '/auth/register',
    '/auth/invite-set-password',
    '/auth/reset-password',
    '/auth/forgot-password',
  ])
  const isAuthRoute = publicAuthPaths.has(to.path)
  const isPublicForm = to.path.startsWith('/forms/')
  if (isPublicForm) return

  if (isPublicMarketing) return

  if (isAuthRoute && isAuth) {
    return navigateTo('/dashboard', { replace: true })
  }

  // On server, never redirect to login for protected routes: auth lives in localStorage
  // so SSR has no token. Rendering the requested page keeps layout (default vs auth) in sync
  // and avoids hydration mismatch; client will redirect if still unauthenticated.
  if (import.meta.server && !isAuthRoute && !isAuth) {
    return
  }

  if (!isAuthRoute && !isPublicMarketing && !isAuth) {
    return navigateTo('/auth/login', { replace: true })
  }
})
