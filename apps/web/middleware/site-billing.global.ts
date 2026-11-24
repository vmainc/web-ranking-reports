/**
 * After trial without a subscription, block site workspace routes except site Settings (upgrade / delete).
 */
const SITE_BILLING_CACHE_MS = 60_000

type SiteBillingCacheEntry = { locked: boolean; fetchedAt: number }

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const { plansEnabled } = usePlansMode()
  if (!plansEnabled.value) return

  const path = to.path.replace(/\/$/, '') || '/'
  const m = path.match(/^\/sites\/([^/]+)(?:\/(.*))?$/u)
  if (!m) return

  const siteId = m[1]
  const rest = (m[2] || '').split('?')[0]
  if (rest === 'settings') return

  const pb = usePocketbase()
  const token = pb.authStore.token
  if (!token) return

  const cache = useState<Record<string, SiteBillingCacheEntry>>('wrr-site-billing-locked', () => ({}))
  const now = Date.now()
  const cached = cache.value[siteId]
  if (cached && now - cached.fetchedAt < SITE_BILLING_CACHE_MS) {
    if (cached.locked) {
      return navigateTo({ path: '/settings/billing', query: { site: siteId } })
    }
    return
  }

  try {
    const st = await $fetch<{ locked: boolean }>(`/api/billing/site/${siteId}/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    cache.value = {
      ...cache.value,
      [siteId]: { locked: !!st.locked, fetchedAt: now },
    }
    if (st.locked) {
      return navigateTo({ path: '/settings/billing', query: { site: siteId } })
    }
  } catch {
    // allow navigation if status check fails (offline / transient)
  }
})
