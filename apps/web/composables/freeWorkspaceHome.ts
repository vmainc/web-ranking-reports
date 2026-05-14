/**
 * Where free-tier workspace owners should land: their first site’s dashboard when they have
 * at least one site; otherwise the sites list so they can add one.
 */
export async function getFreeTierSiteDashboardOrSitesListPath(): Promise<string> {
  const pb = usePocketbase()
  const token = String(pb.authStore.token || '').trim()
  if (!token) return '/sites'
  const headers = {
    Authorization: `Bearer ${token}`,
    'X-WRR-Authorization': `Bearer ${token}`,
  }
  try {
    const res = await $fetch<{ sites?: Array<{ id: string }> }>('/api/workspace/sites', { headers })
    const sites = Array.isArray(res?.sites) ? res.sites : []
    if (sites.length >= 1) {
      const id = String(sites[0]?.id || '').trim()
      if (id) return `/sites/${id}/dashboard`
    }
  } catch {
    // fall through
  }
  return '/sites'
}
