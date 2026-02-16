import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { clearCacheForSite } from '~/server/utils/ga4Helpers'

const GOOGLE_ANCHOR = 'google_analytics'
const GOOGLE_PROVIDERS = ['google_analytics', 'google_search_console', 'lighthouse', 'google_business_profile', 'google_ads'] as const

/** Copy Google Analytics (and GSC) connection from another site of the same user. Target site gets same tokens; property_id cleared so user picks on dashboard. */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { siteId?: string; sourceSiteId?: string }
  const siteId = body?.siteId
  const sourceSiteId = body?.sourceSiteId
  if (!siteId || !sourceSiteId) throw createError({ statusCode: 400, message: 'siteId and sourceSiteId required' })
  if (siteId === sourceSiteId) throw createError({ statusCode: 400, message: 'sourceSiteId must differ from siteId' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)
  await assertSiteOwnership(pb, sourceSiteId, userId)

  const sourceList = await pb.collection('integrations').getFullList<{
    id: string
    provider: string
    config_json?: Record<string, unknown> & { property_id?: string; property_name?: string }
  }>({
    filter: `site = "${sourceSiteId}"`,
  })
  const gaSource = sourceList.find((r) => r.provider === GOOGLE_ANCHOR)
  if (!gaSource?.config_json?.google) throw createError({ statusCode: 400, message: 'Source site has no Google Analytics connection.' })

  const targetList = await pb.collection('integrations').getFullList<{ id: string; provider: string }>({
    filter: `site = "${siteId}"`,
  })

  const now = new Date().toISOString()
  const gaConfig = { ...gaSource.config_json }
  delete gaConfig.property_id
  delete gaConfig.property_name
  delete gaConfig.gbp_account_id
  delete gaConfig.gbp_location_id
  delete gaConfig.gbp_location_name

  for (const provider of GOOGLE_PROVIDERS) {
    const src = sourceList.find((r) => r.provider === provider)
    const targetRec = targetList.find((r) => r.provider === provider)
    const config =
      provider === GOOGLE_ANCHOR
        ? gaConfig
        : src?.config_json && typeof src.config_json === 'object' && (src.config_json as { linked_to?: string }).linked_to === GOOGLE_ANCHOR
          ? { linked_to: GOOGLE_ANCHOR }
          : { linked_to: GOOGLE_ANCHOR }
    if (targetRec) {
      await pb.collection('integrations').update(targetRec.id, {
        status: 'connected',
        connected_at: now,
        config_json: config,
      })
    } else {
      await pb.collection('integrations').create({
        site: siteId,
        provider,
        status: 'connected',
        connected_at: now,
        config_json: config,
      })
    }
  }

  clearCacheForSite(siteId)
  return { ok: true }
})
