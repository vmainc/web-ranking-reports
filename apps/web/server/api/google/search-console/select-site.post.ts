import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getGAAccessToken } from '~/server/utils/gaAccess'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { siteId?: string; site_url?: string; site_name?: string }
  const siteId = body?.siteId
  const site_url = body?.site_url ?? ''
  const site_name = body?.site_name ?? site_url

  if (!siteId || !site_url) throw createError({ statusCode: 400, message: 'siteId and site_url required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const { integration } = await getGAAccessToken(pb, siteId)

  await pb.collection('integrations').update(integration.id, {
    config_json: {
      ...integration.config_json,
      gsc_site_url: site_url,
      gsc_site_name: site_name || site_url,
    },
  })

  return { ok: true }
})
