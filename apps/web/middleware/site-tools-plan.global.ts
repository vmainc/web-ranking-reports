/**
 * Site "Tools" (to-do, site audit, research, content generator) require Growth+.
 * Free and Starter owners are sent back to the site workspace home.
 */
const TOOLS_PATH = /^\/sites\/([^/]+)\/(to-do|site-audit|research|content-generator)(?:\/|$)/u

export default defineNuxtRouteMiddleware(async (to) => {
  const m = to.path.match(TOOLS_PATH)
  if (!m) return

  const pb = usePocketbase()
  const token = String(pb.authStore.token || '').trim()
  if (!token) return

  try {
    const st = await $fetch<{ plan?: string }>('/api/subscriptions/status', {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-WRR-Authorization': `Bearer ${token}`,
      },
    })
    const p = String(st?.plan || '').toLowerCase().trim()
    if (p === 'free' || p === 'starter') {
      return navigateTo(`/sites/${m[1]}`)
    }
  } catch {
    return navigateTo(`/sites/${m[1]}`)
  }
})
