/**
 * Server-side PocketBase admin client and auth helpers.
 * Uses PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD so tokens stay server-side.
 * In production we read from process.env via dynamic keys so the bundler doesn't replace them at build time.
 */

import type { H3Event } from 'h3'
import { getRequestHeader } from 'h3'
import PocketBase from 'pocketbase'

const GOOGLE_ANCHOR_PROVIDER = 'google_analytics'
const GOOGLE_PROVIDERS = [
  'google_analytics',
  'google_search_console',
  'lighthouse',
  'google_business_profile',
  'google_ads',
  'google_local_services_ads',
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

/** Bases to validate user JWTs (auth-refresh): internal Docker URL first, then browser-facing PB URL. */
function pocketbaseUserAuthRefreshBases(): string[] {
  const internal = getPbUrl().replace(/\/+$/, '')
  const cfg = useRuntimeConfig()
  const pubRaw =
    (typeof cfg.public?.pocketbaseUrl === 'string' && cfg.public.pocketbaseUrl.trim()) ||
    env('NUXT_PUBLIC_POCKETBASE_URL') ||
    ''
  const pub = pubRaw.replace(/\/+$/, '')
  const list = [internal, pub].filter(Boolean)
  return [...new Set(list)]
}

async function pocketbaseAuthRefreshUserId(token: string): Promise<string | null> {
  const bases = pocketbaseUserAuthRefreshBases()
  for (const base of bases) {
    const url = `${base.replace(/\/+$/, '')}/api/collections/users/auth-refresh`
    for (const authorization of [token, `Bearer ${token}`]) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authorization },
          body: JSON.stringify({}),
        })
        if (!res.ok) continue
        const data = (await res.json()) as { record?: { id?: string } }
        const id = data?.record?.id
        if (id) return id
      } catch {
        // try next base or Authorization variant (network / TLS to internal vs public)
      }
    }
  }
  return null
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

/**
 * JWT / auth token from the incoming request (PocketBase JS SDK sends `Authorization: <token>`
 * without a `Bearer ` prefix; our app also sends `Bearer <token>` from some clients).
 */
/** Strip optional `Bearer ` prefix (PocketBase accepts raw JWT in Authorization). */
export function normalizePocketbaseUserToken(raw: string): string {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return ''
  if (trimmed.toLowerCase().startsWith('bearer ')) return trimmed.slice(7).trim()
  return trimmed
}

export function getUserAuthTokenFromEvent(event: H3Event): string {
  const auth =
    getRequestHeader(event, 'authorization') ||
    (typeof event.headers?.get === 'function' ? event.headers.get('authorization') : null) ||
    getRequestHeader(event, 'x-wrr-authorization') ||
    (typeof event.headers?.get === 'function' ? event.headers.get('x-wrr-authorization') : null) ||
    ''
  return normalizePocketbaseUserToken(auth)
}

/**
 * Resolve the PocketBase `users` record id from a user JWT (or pdf one-time token).
 * Used by API routes; pass `extraToken` when the client duplicates the token in JSON (some CDNs strip Authorization on POST).
 */
export async function getUserIdFromRequest(event: H3Event, extraToken?: string): Promise<string | null> {
  const fromHeader = getUserAuthTokenFromEvent(event)
  const fromBody = normalizePocketbaseUserToken(extraToken || '')
  const token = fromHeader || fromBody
  if (!token) return null
  const { resolvePdfToken } = await import('~/server/utils/pdfToken')
  const pdf = resolvePdfToken(token)
  if (pdf) return pdf.userId
  // PocketBase docs: Authorization: <token>. Proxies may strip headers on POST (use body pbClientToken). User JWT
  // minted against the public PB URL must still validate: try internal PB_URL then NUXT_PUBLIC_POCKETBASE_URL.
  return await pocketbaseAuthRefreshUserId(token)
}

/** Load email for a user id using the caller’s Bearer token (same pattern as /api/admin/check). */
export async function getUserEmailForUserId(event: H3Event, userId: string): Promise<string> {
  const token = getUserAuthTokenFromEvent(event).trim()
  if (!token) return ''
  const base = (useRuntimeConfig().public?.pocketbaseUrl as string || 'http://127.0.0.1:8090').replace(/\/+$/, '')
  const profileRes = await fetch(`${base}/api/collections/users/records/${userId}`, {
    headers: { Authorization: token },
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
