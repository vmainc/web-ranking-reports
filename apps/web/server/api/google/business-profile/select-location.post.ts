import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

const GOOGLE_ANCHOR = 'google_analytics'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as {
    siteId?: string
    accountId?: string
    locationId?: string
    locationName?: string
  }
  const { siteId, accountId, locationId, locationName } = body
  if (!siteId || !locationId) throw createError({ statusCode: 400, message: 'siteId and locationId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const list = await pb.collection('integrations').getFullList<{ id: string; config_json?: Record<string, unknown> }>({
    filter: `site = "${siteId}" && provider = "${GOOGLE_ANCHOR}"`,
  })
  const integration = list[0]
  if (!integration) throw createError({ statusCode: 400, message: 'Connect Google first.' })

  const config = { ...integration.config_json }
  config.gbp_account_id = accountId ?? ''
  config.gbp_location_id = locationId
  config.gbp_location_name = locationName ?? locationId

  await pb.collection('integrations').update(integration.id, { config_json: config })
  return { ok: true }
})
