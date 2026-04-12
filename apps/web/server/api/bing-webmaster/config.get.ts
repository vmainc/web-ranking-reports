import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { getBingWebmasterIntegration } from '~/server/utils/bingWebmasterAccess'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = query.siteId as string
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteAccess(pb, siteId, userId, false)

  const integration = await getBingWebmasterIntegration(pb, siteId)
  const hasKey = Boolean(integration?.config_json?.api_key?.trim())
  return {
    configured: hasKey && integration?.status === 'connected',
    // Do not expose api_key to client
  }
})
