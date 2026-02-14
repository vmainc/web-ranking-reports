import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getGAAccessToken } from '~/server/utils/gaAccess'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { siteId?: string; property_id?: string; property_name?: string }
  const siteId = body?.siteId
  const property_id = body?.property_id ?? ''
  const property_name = body?.property_name ?? ''

  if (!siteId || !property_id) {
    throw createError({ statusCode: 400, message: 'siteId and property_id required' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const { integration } = await getGAAccessToken(pb, siteId)

  await pb.collection('integrations').update(integration.id, {
    config_json: {
      ...integration.config_json,
      property_id,
      property_name: property_name || integration.config_json?.property_name,
    },
  })

  return { ok: true }
})
