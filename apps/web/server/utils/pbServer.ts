/**
 * Server-side PocketBase admin client and auth helpers.
 * Uses PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD so tokens stay server-side.
 * In production we read from process.env via dynamic keys so the bundler doesn't replace them at build time.
 */

import PocketBase from 'pocketbase'

const GOOGLE_ANCHOR_PROVIDER = 'google_analytics'
const GOOGLE_PROVIDERS = ['google_analytics', 'google_search_console', 'lighthouse', 'google_business_profile', 'google_ads'] as const

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

/** Resolved list of emails allowed to access Admin (env + fallback for this project). Always returns an array. */
export function getAdminEmails(): string[] {
  const config = useRuntimeConfig()
  const raw = config.adminEmails
  let fromConfig: string[] = []
  if (Array.isArray(raw)) {
    fromConfig = raw.filter((e): e is string => typeof e === 'string').map((e) => e.trim()).filter(Boolean)
  } else if (typeof raw === 'string') {
    fromConfig = raw.split(',').map((e: string) => e.trim()).filter(Boolean)
  }
  if (fromConfig.length > 0) return fromConfig
  const k1 = 'ADMIN_EMAILS'
  const k2 = 'NUXT_ADMIN_EMAILS'
  const envVal = (env(k1) || env(k2)).split(',').map((e: string) => e.trim()).filter(Boolean)
  if (envVal.length > 0) return envVal
  return ['admin@vma.agency']
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

/** Ensure user owns the site. Returns site record or throws. */
export async function assertSiteOwnership(
  pb: PocketBase,
  siteId: string,
  userId: string
): Promise<{ id: string; user: string; name: string; domain: string }> {
  const site = await pb.collection('sites').getOne(siteId)
  if ((site as { user?: string }).user !== userId) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
  return site as { id: string; user: string; name: string; domain: string }
}

export function getGoogleAnchorProvider(): typeof GOOGLE_ANCHOR_PROVIDER {
  return GOOGLE_ANCHOR_PROVIDER
}

export function getGoogleProviders(): readonly GoogleProvider[] {
  return GOOGLE_PROVIDERS
}
