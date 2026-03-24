import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { clearCacheForSite } from '~/server/utils/ga4Helpers'
import type { UserDefaultGoogleJson } from '~/server/utils/userGoogleAccess'

const GOOGLE_ANCHOR = 'google_analytics'
const GOOGLE_PROVIDERS = [
  'google_analytics',
  'google_search_console',
  'lighthouse',
  'google_business_profile',
  'google_ads',
  'google_calendar',
] as const

/** Copy the signed-in user's default Google OAuth tokens to a site (same shape as site connect). */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { siteId?: string }
  const siteId = body?.siteId
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const user = await pb.collection('users').getOne<{ default_google_json?: UserDefaultGoogleJson }>(userId)
  const src = user?.default_google_json
  const google = src?.google
  if (!google?.refresh_token && !google?.access_token) {
    throw createError({ statusCode: 400, message: 'No default Google account. Connect Google under Account first.' })
  }

  const cleanAnchor: Record<string, unknown> = {
    google: { ...google },
  }

  const targetList = await pb.collection('integrations').getFullList<{ id: string; provider: string }>({
    filter: `site = "${siteId}"`,
  })
  const now = new Date().toISOString()

  for (const provider of GOOGLE_PROVIDERS) {
    const targetRec = targetList.find((r) => r.provider === provider)
    const configJson = provider === GOOGLE_ANCHOR ? cleanAnchor : { linked_to: GOOGLE_ANCHOR }
    if (targetRec) {
      await pb.collection('integrations').update(targetRec.id, {
        status: 'connected',
        connected_at: now,
        config_json: configJson,
      })
    } else {
      await pb.collection('integrations').create({
        site: siteId,
        provider,
        status: 'connected',
        connected_at: now,
        config_json: configJson,
      })
    }
  }

  clearCacheForSite(siteId)
  return { ok: true }
})
