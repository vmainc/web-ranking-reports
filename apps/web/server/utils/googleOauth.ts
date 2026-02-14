/**
 * Google OAuth: token exchange and userinfo.
 * Used only on server; client_secret never exposed.
 */

export interface GoogleOAuthSettings {
  client_id: string
  client_secret: string
  redirect_uri: string
  scopes?: string[]
}

const DEFAULT_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
]

export function getScopes(settings: GoogleOAuthSettings): string[] {
  return settings.scopes?.length ? settings.scopes : DEFAULT_SCOPES
}

export async function exchangeCodeForTokens(
  settings: GoogleOAuthSettings,
  code: string
): Promise<{
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
  id_token?: string
}> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: settings.client_id,
      client_secret: settings.client_secret,
      redirect_uri: settings.redirect_uri,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google token exchange failed: ${res.status} ${text}`)
  }
  return (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    token_type?: string
    scope?: string
    id_token?: string
  }
}

export async function fetchUserInfo(accessToken: string): Promise<{ sub: string; email?: string }> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Google userinfo failed: ${res.status}`)
  return (await res.json()) as { sub: string; email?: string }
}

export function buildAuthUrl(settings: GoogleOAuthSettings, state: string, promptConsent: boolean): string {
  const scopes = getScopes(settings)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: settings.client_id,
    redirect_uri: settings.redirect_uri,
    scope: scopes.join(' '),
    state,
    access_type: 'offline',
    include_granted_scopes: 'true',
  })
  if (promptConsent) params.set('prompt', 'consent')
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function refreshAccessToken(
  settings: GoogleOAuthSettings,
  refreshToken: string
): Promise<{ access_token: string; expires_in?: number }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: settings.client_id,
      client_secret: settings.client_secret,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google token refresh failed: ${res.status} ${text}`)
  }
  return (await res.json()) as { access_token: string; expires_in?: number }
}
