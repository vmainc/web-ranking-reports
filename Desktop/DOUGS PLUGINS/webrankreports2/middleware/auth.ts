export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip auth check on client-side navigation if we're already on login page
  if (process.client && to.path === '/auth/login') {
    return
  }
  
  const nuxtApp = useNuxtApp()
  const $supabase = nuxtApp.$supabase
  
  if (!$supabase) {
    console.error('Supabase client is not available')
    return navigateTo('/auth/login')
  }
  
  try {
    const { data: { session }, error } = await $supabase.auth.getSession()
    
    if (error) {
      console.error('Session check error:', error)
      return navigateTo('/auth/login')
    }
    
    if (!session) {
      // Only redirect if not already going to login
      if (to.path !== '/auth/login' && to.path !== '/auth/register') {
        return navigateTo('/auth/login')
      }
    }
  } catch (error) {
    console.error('Auth check failed:', error)
    // Only redirect if not already on auth pages
    if (to.path !== '/auth/login' && to.path !== '/auth/register') {
      return navigateTo('/auth/login')
    }
  }
})

