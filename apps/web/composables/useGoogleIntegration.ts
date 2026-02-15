/**
 * Client composable for Google (GA + GSC) connect/disconnect and status.
 * Sends PB auth token so server can identify the user.
 */

export interface GoogleStatusResponse {
  connected: boolean
  providers: {
    google_analytics: { status: string; hasScope: boolean }
    google_search_console: { status: string; hasScope: boolean }
  }
  email: string | null
  selectedProperty?: { id: string; name: string } | null
  selectedSearchConsoleSite?: { siteUrl: string; name: string } | null
}

function authHeaders(): Record<string, string> {
  const pb = usePocketbase()
  const token = pb.authStore.token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export function useGoogleIntegration() {
  async function getAuthUrl(siteId: string): Promise<string> {
    const { url } = await $fetch<{ url: string }>('/api/google/auth-url', {
      query: { siteId },
      headers: authHeaders(),
    })
    return url
  }

  async function getStatus(siteId: string): Promise<GoogleStatusResponse> {
    return await $fetch<GoogleStatusResponse>('/api/google/status', {
      query: { siteId },
      headers: authHeaders(),
    })
  }

  async function getProperties(siteId: string): Promise<{ properties: Array<{ id: string; name: string; accountName?: string }> }> {
    return await $fetch('/api/google/analytics/properties', {
      query: { siteId },
      headers: authHeaders(),
    })
  }

  async function selectProperty(
    siteId: string,
    propertyId: string,
    propertyName: string
  ): Promise<void> {
    await $fetch('/api/google/analytics/select-property', {
      method: 'POST',
      body: { siteId, property_id: propertyId, property_name: propertyName },
      headers: authHeaders(),
    })
  }

  async function getReport(
    siteId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    propertyId: string
    startDate: string
    endDate: string
    rows: Array<{ date: string; activeUsers: number; sessions: number; screenPageViews: number }>
    summary: { activeUsers: number; sessions: number; screenPageViews: number } | null
  }> {
    const query: Record<string, string> = { siteId }
    if (startDate) query.startDate = startDate
    if (endDate) query.endDate = endDate
    return await $fetch('/api/google/analytics/report', {
      query,
      headers: authHeaders(),
    })
  }

  async function disconnect(siteId: string): Promise<void> {
    await $fetch('/api/google/disconnect', {
      method: 'POST',
      body: { siteId },
      headers: authHeaders(),
    })
  }

  /** Another site of this user that has GA connected (for "Use existing account"). */
  async function getOtherConnectedSite(siteId: string): Promise<{ otherSiteId: string | null; otherSiteName: string | null }> {
    return await $fetch<{ otherSiteId: string | null; otherSiteName: string | null }>('/api/google/other-connected-site', {
      query: { siteId },
      headers: authHeaders(),
    })
  }

  /** Copy GA connection from sourceSiteId to siteId. User then picks property on dashboard. */
  async function copyConnection(siteId: string, sourceSiteId: string): Promise<void> {
    await $fetch('/api/google/copy-connection', {
      method: 'POST',
      body: { siteId, sourceSiteId },
      headers: authHeaders(),
    })
  }

  /** Clear selected GA4 property so user can pick another. */
  async function clearProperty(siteId: string): Promise<void> {
    await $fetch('/api/google/analytics/clear-property', {
      method: 'POST',
      body: { siteId },
      headers: authHeaders(),
    })
  }

  async function getGscSites(siteId: string): Promise<{ sites: Array<{ siteUrl: string; permissionLevel?: string }> }> {
    return await $fetch('/api/google/search-console/sites', {
      query: { siteId },
      headers: authHeaders(),
    })
  }

  async function selectGscSite(siteId: string, siteUrl: string, siteName?: string): Promise<void> {
    await $fetch('/api/google/search-console/select-site', {
      method: 'POST',
      body: { siteId, site_url: siteUrl, site_name: siteName },
      headers: authHeaders(),
    })
  }

  async function clearGscSite(siteId: string): Promise<void> {
    await $fetch('/api/google/search-console/clear-site', {
      method: 'POST',
      body: { siteId },
      headers: authHeaders(),
    })
  }

  async function getGscReport(
    siteId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    siteUrl: string
    startDate: string
    endDate: string
    rows: Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>
    summary: { clicks: number; impressions: number; ctr: number; position: number } | null
  }> {
    const query: Record<string, string> = { siteId }
    if (startDate) query.startDate = startDate
    if (endDate) query.endDate = endDate
    return await $fetch('/api/google/search-console/report', {
      query,
      headers: authHeaders(),
    })
  }

  /** Top search queries (keywords) for the property in the date range. */
  async function getGscReportQueries(
    siteId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    siteUrl: string
    startDate: string
    endDate: string
    rows: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>
  }> {
    const query: Record<string, string> = { siteId, dimension: 'query' }
    if (startDate) query.startDate = startDate
    if (endDate) query.endDate = endDate
    return await $fetch('/api/google/search-console/report', {
      query,
      headers: authHeaders(),
    })
  }

  /** Top pages (URLs) for the property in the date range. */
  async function getGscReportPages(
    siteId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    siteUrl: string
    startDate: string
    endDate: string
    rows: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>
  }> {
    const query: Record<string, string> = { siteId, dimension: 'page' }
    if (startDate) query.startDate = startDate
    if (endDate) query.endDate = endDate
    return await $fetch('/api/google/search-console/report', {
      query,
      headers: authHeaders(),
    })
  }

  /** Returns { ok: true, url } and redirects, or { ok: false, message } on error (e.g. OAuth not configured). */
  async function redirectToGoogle(siteId: string): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
    try {
      const url = await getAuthUrl(siteId)
      window.location.href = url
      return { ok: true, url }
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'data' in e && e.data && typeof (e.data as { message?: string }).message === 'string'
          ? (e.data as { message: string }).message
          : e instanceof Error
            ? e.message
            : 'Connect Google is unavailable. Configure Google OAuth in Admin → Integrations.'
      return { ok: false, message: msg }
    }
  }

  return {
    getAuthUrl,
    getStatus,
    getProperties,
    selectProperty,
    getReport,
    disconnect,
    getOtherConnectedSite,
    copyConnection,
    clearProperty,
    getGscSites,
    selectGscSite,
    clearGscSite,
    getGscReport,
    getGscReportQueries,
    getGscReportPages,
    redirectToGoogle,
  }
}
