// Shared utility for refreshing Google OAuth tokens
// Used by Edge Functions that need to make Google API calls
// This helper checks token expiry and refreshes if needed

interface TokenRefreshResult {
  accessToken: string
  wasRefreshed: boolean
}

/**
 * Refreshes a Google OAuth access token if it's expired or close to expiry
 * @param accessToken Current access token
 * @param refreshToken Refresh token (required if access token is expired)
 * @param expiresAt ISO string of when the token expires
 * @param serviceType 'ga4' | 'gsc' | 'ads' - used for logging
 * @returns Object with the valid access token and whether it was refreshed
 */
export async function refreshGoogleTokenIfNeeded(
  accessToken: string,
  refreshToken: string | null,
  expiresAt: string | null,
  serviceType: 'ga4' | 'gsc' | 'ads' = 'ga4'
): Promise<TokenRefreshResult> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  // Check if token is expired or expiring soon (5 minute buffer)
  const now = new Date()
  const expiryDate = expiresAt ? new Date(expiresAt) : new Date(0)
  const bufferTime = 5 * 60 * 1000 // 5 minutes

  if (expiryDate.getTime() - bufferTime <= now.getTime()) {
    // Token expired or expiring soon, refresh it
    if (!refreshToken) {
      throw new Error(`${serviceType.toUpperCase()} access token expired and no refresh token available`)
    }

    console.log(`Refreshing ${serviceType.toUpperCase()} token...`)

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(`${serviceType.toUpperCase()} token refresh failed: ${error.error_description || error.error}`)
    }

    const tokenData = await response.json()
    const newAccessToken = tokenData.access_token

    if (!newAccessToken) {
      throw new Error(`${serviceType.toUpperCase()} token refresh did not return an access token`)
    }

    return {
      accessToken: newAccessToken,
      wasRefreshed: true,
    }
  }

  // Token is still valid
  return {
    accessToken: accessToken,
    wasRefreshed: false,
  }
}

/**
 * Updates token in site_integrations after refresh
 * Call this after refreshGoogleTokenIfNeeded if wasRefreshed is true
 */
export async function updateTokenInDatabase(
  supabase: any,
  siteId: string,
  serviceType: 'ga4' | 'gsc' | 'ads',
  newAccessToken: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now

  const updateField = `${serviceType}_access_token`
  const expiresField = `${serviceType}_token_expires_at`

  const { error } = await supabase
    .from('site_integrations')
    .update({
      [updateField]: newAccessToken,
      [expiresField]: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('site_id', siteId)

  if (error) {
    console.error(`Error updating ${serviceType.toUpperCase()} token:`, error)
    throw error
  }
}

