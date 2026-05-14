/**
 * Free- and Starter-tier workspace owners: first site at `/sites/{id}` when they have a site,
 * otherwise `/sites` to add one.
 */
export async function getFreeTierSiteHomeOrSitesListPath(): Promise<string> {
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
      if (id) return `/sites/${id}`
    }
  } catch {
    // fall through
  }
  return '/sites'
}

/** After email/password auth: clients → `/sites`; free/starter owners → site home or sites list; Growth+ → `/dashboard`. */
export async function resolveWorkspaceOwnerHomeAfterAuth(): Promise<string> {
  const pb = usePocketbase()
  const model = pb.authStore.model as { account_type?: string } | null
  if (String(model?.account_type ?? '').toLowerCase().trim() === 'client') {
    return '/sites'
  }
  const token = String(pb.authStore.token || '').trim()
  if (!token) return '/sites'
  const headers = {
    Authorization: `Bearer ${token}`,
    'X-WRR-Authorization': `Bearer ${token}`,
  }
  try {
    const st = await $fetch<{ plan?: string }>('/api/subscriptions/status', { headers })
    const p = String(st?.plan || '').toLowerCase().trim()
    if (p === 'free' || p === 'starter') {
      return await getFreeTierSiteHomeOrSitesListPath()
    }
  } catch {
    return '/dashboard'
  }
  return '/dashboard'
}
