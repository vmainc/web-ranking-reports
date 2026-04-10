export default defineNuxtRouteMiddleware((to) => {
  const pb = usePocketbase()
  const isAuth = pb.authStore.isValid

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

  if (to.path === '/') {
    return navigateTo(isAuth ? '/dashboard' : '/auth/login', { replace: true })
  }

  if (isAuthRoute && isAuth) {
    return navigateTo('/dashboard', { replace: true })
  }

  // On server, never redirect to login for protected routes: auth lives in localStorage
  // so SSR has no token. Rendering the requested page keeps layout (default vs auth) in sync
  // and avoids hydration mismatch; client will redirect if still unauthenticated.
  if (import.meta.server && !isAuthRoute && !isAuth) {
    return
  }

  if (!isAuthRoute && !isAuth) {
    return navigateTo('/auth/login', { replace: true })
  }
})
