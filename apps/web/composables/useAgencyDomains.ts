export interface AgencyDomainSiteRef {
  id: string
  name: string
}

export interface AgencyDomainRow {
  domain: string
  sites: AgencyDomainSiteRef[]
  expirationDate: string | null
  daysRemaining: number | null
  domainAgeYears: number | null
  registrar: string | null
  updatedAt: string | null
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  whoisError?: string
}

export interface AgencyDomainsResponse {
  whoisConfigured: boolean
  domains: AgencyDomainRow[]
  stats: {
    total: number
    expiring30: number
    expiring90: number
    averageDomainAgeYears: number | null
  }
}

export function useAgencyDomains() {
  const pb = usePocketbase()

  const data = ref<AgencyDomainsResponse | null>(null)
  /** Initial load / full reload (skeleton). */
  const pending = ref(false)
  /** Refresh with existing data still visible. */
  const refreshing = ref(false)
  const error = ref<string | null>(null)

  function authHeaders(): Record<string, string> {
    const token = pb.authStore.token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function load(forceRefresh = false) {
    error.value = null
    if (forceRefresh && data.value) refreshing.value = true
    else pending.value = true
    try {
      data.value = await $fetch<AgencyDomainsResponse>('/api/agency/domains', {
        query: forceRefresh ? { refresh: '1' } : {},
        headers: authHeaders(),
      })
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      error.value = err?.data?.message ?? err?.message ?? 'Could not load domains'
      if (!forceRefresh) data.value = null
    } finally {
      pending.value = false
      refreshing.value = false
    }
  }

  return { data, pending, refreshing, error, load }
}
