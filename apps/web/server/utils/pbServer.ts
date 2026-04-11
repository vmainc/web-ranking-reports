/**
 * Server-side PocketBase admin client and auth helpers.
 * Uses PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD so tokens stay server-side.
 * In production we read from process.env via dynamic keys so the bundler doesn't replace them at build time.
 */

import PocketBase from 'pocketbase'

const GOOGLE_ANCHOR_PROVIDER = 'google_analytics'
const GOOGLE_PROVIDERS = [
  'google_analytics',
  'google_search_console',
  'lighthouse',
  'google_business_profile',
  'google_ads',
  'google_calendar',
] as const

export type GoogleProvider = (typeof GOOGLE_PROVIDERS)[number]

/** Read env at runtime; dynamic key prevents build-time replacement. */
function env(key: string): string {
  if (typeof process === 'undefined' || !process.env) return ''
  return (process.env[key] ?? '') as string
}

function getPbUrl(): string {
  const config = useRuntimeConfig()
  const fromConfig = (config.pbUrl as string)?.replace?.(/\/+$/, '')
  if (fromConfig) return fromConfig
  const url = env('PB_URL') || env('NUXT_PB_URL') || 'http://127.0.0.1:8090'
  return url.replace(/\/+$/, '')
}

function getPbAdminCredentials(): { email: string; password: string } {
  const config = useRuntimeConfig()
  const email =
    (config.pbAdminEmail as string) ||
    env('PB_ADMIN_EMAIL') ||
    env('NUXT_PB_ADMIN_EMAIL') ||
    ''
  const password =
    (config.pbAdminPassword as string) ||
    env('PB_ADMIN_PASSWORD') ||
    env('NUXT_PB_ADMIN_PASSWORD') ||
    ''
  return { email, password }
}

export function getAdminPb(): PocketBase {
  const url = getPbUrl()
  return new PocketBase(url)
}

export async function adminAuth(pb: PocketBase): Promise<void> {
  const { email, password } = getPbAdminCredentials()
  if (!email || !password) throw new Error('PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD not set')
  await pb.admins.authWithPassword(email, password)
}

const VMA_ADMIN_EMAIL = 'admin@vma.agency'

/** Resolved list of emails allowed to access Admin (env + fallback). admin@vma.agency is always included. */
export function getAdminEmails(): string[] {
  const config = useRuntimeConfig()
  const raw = config.adminEmails
  let fromConfig: string[] = []
  if (Array.isArray(raw)) {
    fromConfig = raw.filter((e): e is string => typeof e === 'string').map((e) => e.trim()).filter(Boolean)
  } else if (typeof raw === 'string') {
    fromConfig = raw.split(',').map((e: string) => e.trim()).filter(Boolean)
  }
  const fromEnv = (env('ADMIN_EMAILS') || env('NUXT_ADMIN_EMAILS'))
    .split(',')
    .map((e: string) => e.trim())
    .filter(Boolean)
  const combined = [...new Set([...fromConfig, ...fromEnv, VMA_ADMIN_EMAIL])]
  return combined.length > 0 ? combined : [VMA_ADMIN_EMAIL]
}

/** Get current user id from request Authorization: Bearer <token>. Validates token with PB or pdf one-time token. */
export async function getUserIdFromRequest(event: { headers: { get: (n: string) => string | null } }): Promise<string | null> {
  const auth = event.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null
  if (!token) return null
  const { resolvePdfToken } = await import('~/server/utils/pdfToken')
  const pdf = resolvePdfToken(token)
  if (pdf) return pdf.userId
  const pbUrl = getPbUrl()
  const res = await fetch(`${pbUrl}/api/collections/users/auth-refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { record?: { id?: string } }
  return data?.record?.id ?? null
}

/** Load email for a user id using the caller’s Bearer token (same pattern as /api/admin/check). */
export async function getUserEmailForUserId(
  event: { headers: { get: (n: string) => string | null } },
  userId: string,
): Promise<string> {
  const auth = event.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return ''
  const base = (useRuntimeConfig().public?.pocketbaseUrl as string || 'http://127.0.0.1:8090').replace(/\/+$/, '')
  const profileRes = await fetch(`${base}/api/collections/users/records/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!profileRes.ok) return ''
  const userRecord = (await profileRes.json()) as { email?: string }
  return userRecord?.email?.trim() || ''
}

/** Ensure user can write the site (owner, agency member, not read-only client). Returns site record or throws. */
export async function assertSiteOwnership(
  pb: PocketBase,
  siteId: string,
  userId: string,
  options?: { skipBillingCheck?: boolean },
): Promise<{ id: string; user: string; name: string; domain: string }> {
  const { assertSiteAccess } = await import('~/server/utils/workspace')
  const { site } = await assertSiteAccess(pb, siteId, userId, true, options)
  return site
}

export function getGoogleAnchorProvider(): typeof GOOGLE_ANCHOR_PROVIDER {
  return GOOGLE_ANCHOR_PROVIDER
}

export function getGoogleProviders(): readonly GoogleProvider[] {
  return GOOGLE_PROVIDERS
}

/**
 * Triggers PocketBase’s password-reset email for a user (public PB API).
 * Configure the reset template in PocketBase so the link opens your app, e.g.
 * `{APP_URL}/auth/reset-password?token={TOKEN}` (adjust placeholders to match your PB version).
 */
export async function requestUsersPasswordResetEmail(pb: PocketBase, email: string): Promise<void> {
  const base = pb.baseUrl.replace(/\/+$/, '')
  const res = await fetch(`${base}/api/collections/users/request-password-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw new Error(msg || `password reset request failed: ${res.status}`)
  }
}
