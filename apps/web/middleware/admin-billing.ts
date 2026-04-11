/**
 * Only admin@vma.agency may open /admin/billing (strict; not the whole Admin area).
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const p = to.path.replace(/\/$/, '') || '/'
  if (p !== '/admin/billing') return
  if (import.meta.server) return

  const pb = usePocketbase()
  const token = pb.authStore.token
  if (!token) {
    return navigateTo('/auth/login')
  }

  try {
    const res = await $fetch<{ allowed: boolean }>('/api/admin/billing/access', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.allowed) {
      return navigateTo('/dashboard')
    }
  } catch {
    return navigateTo('/dashboard')
  }
})
