/** OAuth return can duplicate or preserve `google=` across redirects; normalize like server callback. */
export function normalizeGoogleRouteQuery(raw: unknown): string | undefined {
  if (Array.isArray(raw)) return typeof raw[0] === 'string' ? raw[0] : undefined
  return typeof raw === 'string' ? raw : undefined
}

export type GoogleOAuthToast = 'connected' | 'error' | 'denied' | null

/**
 * Map `?google=` to a toast only when it matches server state. If the user is already connected,
 * treat `error` / `denied` as stale (e.g. prior failed attempt left in the URL) and show nothing.
 */
export function resolveGoogleOAuthToastFromRoute(
  queryGoogle: unknown,
  googleConnected: boolean,
): GoogleOAuthToast {
  const q = normalizeGoogleRouteQuery(queryGoogle)
  if (q === 'connected') return 'connected'
  if (googleConnected && (q === 'error' || q === 'denied')) return null
  if (q === 'error') return 'error'
  if (q === 'denied') return 'denied'
  return null
}
