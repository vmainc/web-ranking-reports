import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

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
  const integration = list[0]
  if (!integration) return { ok: true }

  const config = { ...integration.config_json }
  delete config.gbp_account_id
  delete config.gbp_location_id
  delete config.gbp_location_name
  await pb.collection('integrations').update(integration.id, { config_json: config })
  return { ok: true }
})
