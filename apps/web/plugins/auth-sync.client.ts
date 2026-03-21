/**
 * Run before pages mount so PocketBase authStore ↔ Vue user state is in sync
 * before admin routes call /api/admin/check (avoids false "no access").
 */
export default defineNuxtPlugin({
  name: 'auth-sync',
  enforce: 'pre',
  setup() {
    const { initAuth } = useAuthState()
    initAuth()
  },
})
