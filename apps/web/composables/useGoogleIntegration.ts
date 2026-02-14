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

  function redirectToGoogle(siteId: string): void {
    getAuthUrl(siteId).then((url) => {
      window.location.href = url
    })
  }

  return { getAuthUrl, getStatus, getProperties, selectProperty, getReport, disconnect, redirectToGoogle }
}
