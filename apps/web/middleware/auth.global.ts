export default defineNuxtRouteMiddleware((to) => {
  const pb = usePocketbase()
  const isAuth = pb.authStore.isValid

  const isAuthRoute = to.path === '/auth/login' || to.path === '/auth/register'

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
