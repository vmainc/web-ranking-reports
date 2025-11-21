export default defineNuxtRouteMiddleware(async (to, from) => {
  const nuxtApp = useNuxtApp()
  const $supabase = nuxtApp.$supabase
  
  if (!$supabase) {
    console.error('Supabase client is not available')
    return navigateTo('/auth/login')
  }
  
  try {
    const { data: { session } } = await $supabase.auth.getSession()
    
    if (!session) {
      return navigateTo('/auth/login')
    }
  } catch (error) {
    console.error('Auth check failed:', error)
    return navigateTo('/auth/login')
  }
})

