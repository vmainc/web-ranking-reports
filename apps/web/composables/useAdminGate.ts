import type { Ref } from 'vue'

/**
 * Admin-only pages: wait for PocketBase token, then /api/admin/check.
 * `allowed === null` means still checking (avoid flashing "no access").
 *
 * Runs only in the browser — never SSR `$fetch` without a Bearer token (would always fail).
 */
export function useAdminGate(): {
  allowed: Ref<boolean | null>
  hint: Ref<string>
  refresh: () => Promise<void>
} {
  const pb = usePocketbase()
  const allowed = ref<boolean | null>(null) // null = checking
  const hint = ref('')

  async function refresh() {
    if (!import.meta.client) return
    const token = pb.authStore.token
    if (!token) {
      allowed.value = false
      hint.value = 'Not logged in. Open /auth/login and sign in again.'
      return
    }
    try {
      const res = await $fetch<{ allowed: boolean; hint?: string }>('/api/admin/check', {
        headers: { Authorization: `Bearer ${token}` },
      })
      allowed.value = res.allowed
      hint.value = res.hint ?? ''
    } catch {
      allowed.value = false
      hint.value = 'Could not verify admin access. Try refreshing the page.'
    }
  }

  onMounted(() => {
    void refresh()
  })

  watch(
    () => pb.authStore.token,
    () => {
      void refresh()
    },
  )

  return { allowed, hint, refresh }
}
