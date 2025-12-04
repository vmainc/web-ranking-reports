export const useAuth = () => {
  const nuxtApp = useNuxtApp()
  const $supabase = nuxtApp.$supabase

  const user = ref<any>(null)
  const userInitials = ref('U')
  const loading = ref(true)

  // Get user data
  const fetchUserInitials = async () => {
    if (!$supabase) {
      loading.value = false
      return
    }

    try {
      const { data: { user: authUser } } = await $supabase.auth.getUser()
      user.value = authUser
      if (authUser?.email) {
        userInitials.value = authUser.email.charAt(0).toUpperCase()
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      loading.value = false
    }
  }

  // Logout handler
  const handleLogout = async () => {
    if ($supabase) {
      await $supabase.auth.signOut()
    }
    await navigateTo('/auth/login')
  }

  return {
    user,
    userInitials,
    loading,
    fetchUserInitials,
    handleLogout
  }
}

