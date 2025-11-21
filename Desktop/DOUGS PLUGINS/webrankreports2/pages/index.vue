<script setup>
// Redirect to dashboard if logged in, otherwise to login
const nuxtApp = useNuxtApp()
const $supabase = nuxtApp.$supabase

if ($supabase) {
  try {
    const { data: { session } } = await $supabase.auth.getSession()
    if (session) {
      await navigateTo('/dashboard')
      return
    }
  } catch (error) {
    console.error('Session check failed:', error)
  }
}

await navigateTo('/auth/login')
</script>

