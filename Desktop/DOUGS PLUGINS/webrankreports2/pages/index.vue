<script setup>
// Redirect to dashboard if logged in, otherwise to login
const { $supabase } = useNuxtApp()

const { data: { session } } = await $supabase.auth.getSession()
if (session) {
  await navigateTo('/dashboard')
} else {
  await navigateTo('/auth/login')
}
</script>

