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

  if (!isAuthRoute && !isAuth) {
    return navigateTo('/auth/login', { replace: true })
  }
})
