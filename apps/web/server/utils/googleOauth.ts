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

/** Provider-agnostic authorize URL options (Analytics, Gmail, future providers). */
export interface BuildGoogleAuthUrlOptions {
  clientId: string
  redirectUri: string
  scopes: string[]
  state: string
  accessType?: 'online' | 'offline'
  /** When set, adds `prompt` query param (e.g. `consent` for refresh tokens). */
  prompt?: 'none' | 'consent' | 'select_account'
  includeGrantedScopes?: boolean
}

const DEFAULT_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/adwords',
  'https://www.googleapis.com/auth/calendar.readonly',
]

/** Union space-delimited scope strings so incremental OAuth responses do not drop previously granted scopes. */
export function mergeGoogleScopeStrings(previous: string | undefined | null, incoming: string | undefined | null): string {
  const set = new Set<string>()
  for (const s of String(previous ?? '')
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean)) {
    set.add(s)
  }
  for (const s of String(incoming ?? '')
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean)) {
    set.add(s)
  }
  return [...set].join(' ')
}

/** True if stored OAuth scopes include Calendar API read access. */
export function hasStoredGoogleCalendarScope(scopeString: string | undefined | null): boolean {
  if (!scopeString?.trim()) return false
  return scopeString.split(/\s+/).some((s) => {
    const lower = s.toLowerCase()
    return (
      lower.includes('/auth/calendar') ||
      lower.includes('calendar.readonly') ||
      lower.includes('calendar.events')
    )
  })
}

export function getScopes(settings: GoogleOAuthSettings): string[] {
  const base = settings.scopes?.length ? settings.scopes : DEFAULT_SCOPES
  const extra = [
    'https://www.googleapis.com/auth/business.manage',
    'https://www.googleapis.com/auth/adwords',
    'https://www.googleapis.com/auth/calendar.readonly',
  ]
  let out = base
  for (const scope of extra) {
    if (!out.includes(scope)) out = [...out, scope]
  }
  return out
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

function isBuildGoogleAuthUrlOptions(value: unknown): value is BuildGoogleAuthUrlOptions {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'clientId' in value &&
      'redirectUri' in value &&
      'scopes' in value &&
      'state' in value,
  )
}

/**
 * Build Google OAuth authorization URL.
 *
 * Analytics (legacy): `buildAuthUrl(settings, state, promptConsent)` —
 * offline access, `include_granted_scopes=true`, Analytics scope set via `getScopes`.
 *
 * Provider-specific: `buildAuthUrl({ clientId, redirectUri, scopes, state, ... })`.
 */
export function buildAuthUrl(settings: GoogleOAuthSettings, state: string, promptConsent: boolean): string
export function buildAuthUrl(options: BuildGoogleAuthUrlOptions): string
export function buildAuthUrl(
  settingsOrOptions: GoogleOAuthSettings | BuildGoogleAuthUrlOptions,
  state?: string,
  promptConsent?: boolean,
): string {
  const options: BuildGoogleAuthUrlOptions = isBuildGoogleAuthUrlOptions(settingsOrOptions)
    ? settingsOrOptions
    : {
        clientId: settingsOrOptions.client_id,
        redirectUri: settingsOrOptions.redirect_uri,
        scopes: getScopes(settingsOrOptions),
        state: state ?? '',
        accessType: 'offline',
        includeGrantedScopes: true,
        ...(promptConsent ? { prompt: 'consent' as const } : {}),
      }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    scope: options.scopes.join(' '),
    state: options.state,
    access_type: options.accessType ?? 'offline',
    include_granted_scopes: options.includeGrantedScopes === false ? 'false' : 'true',
  })
  if (options.prompt) params.set('prompt', options.prompt)
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
