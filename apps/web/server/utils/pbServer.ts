/**
 * Server-side PocketBase admin client and auth helpers.
 * Uses PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD so tokens stay server-side.
 */

import PocketBase from 'pocketbase'

const GOOGLE_ANCHOR_PROVIDER = 'google_analytics'
const GOOGLE_PROVIDERS = ['google_analytics', 'google_search_console'] as const

export type GoogleProvider = (typeof GOOGLE_PROVIDERS)[number]

export function getAdminPb(): PocketBase {
  const config = useRuntimeConfig()
  const url = (config.pbUrl as string).replace(/\/+$/, '') || 'http://127.0.0.1:8090'
  const pb = new PocketBase(url)
  return pb
}

export async function adminAuth(pb: PocketBase): Promise<void> {
  const config = useRuntimeConfig()
  const email = config.pbAdminEmail as string
  const password = config.pbAdminPassword as string
  if (!email || !password) throw new Error('PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD not set')
  await pb.admins.authWithPassword(email, password)
}

/** Get current user id from request Authorization: Bearer <token>. Validates token with PB or pdf one-time token. */
export async function getUserIdFromRequest(event: { headers: { get: (n: string) => string | null } }): Promise<string | null> {
  const auth = event.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null
  if (!token) return null
  const { resolvePdfToken } = await import('~/server/utils/pdfToken')
  const pdf = resolvePdfToken(token)
  if (pdf) return pdf.userId
  const config = useRuntimeConfig()
  const pbUrl = ((config.pbUrl as string) || '').replace(/\/+$/, '')
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
