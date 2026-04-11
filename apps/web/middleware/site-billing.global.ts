/**
 * After trial without a subscription, block site workspace routes except site Settings (upgrade / delete).
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const path = to.path.replace(/\/$/, '') || '/'
  const m = path.match(/^\/sites\/([^/]+)(?:\/(.*))?$/u)
  if (!m) return

  const siteId = m[1]
  const rest = (m[2] || '').split('?')[0]
  if (rest === 'settings') return

  const pb = usePocketbase()
  const token = pb.authStore.token
  if (!token) return

  try {
    const st = await $fetch<{ locked: boolean }>(`/api/billing/site/${siteId}/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (st.locked) {
      return navigateTo({ path: '/settings/billing', query: { site: siteId } })
    }
  } catch {
    // allow navigation if status check fails (offline / transient)
  }
})
