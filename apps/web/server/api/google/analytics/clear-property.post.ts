import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { clearCacheForSite } from '~/server/utils/ga4Helpers'

const GOOGLE_ANCHOR = 'google_analytics'

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

  const list = await pb.collection('integrations').getFullList<{ id: string; config_json?: Record<string, unknown> }>({
    filter: `site = "${siteId}" && provider = "${GOOGLE_ANCHOR}"`,
  })
  const rec = list[0]
  if (!rec) return { ok: true }

  const config = { ...(rec.config_json ?? {}) }
  delete config.property_id
  delete config.property_name
  await pb.collection('integrations').update(rec.id, { config_json: config })
  clearCacheForSite(siteId)
  return { ok: true }
})
