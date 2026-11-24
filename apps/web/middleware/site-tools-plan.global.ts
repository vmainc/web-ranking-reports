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

  const { plan, ensurePlanLoaded } = useSubscriptionPlan()
  try {
    await ensurePlanLoaded()
    const p = plan.value
    if (p === 'free' || p === 'starter') {
      return navigateTo(`/sites/${m[1]}`)
    }
  } catch {
    return navigateTo(`/sites/${m[1]}`)
  }
})
