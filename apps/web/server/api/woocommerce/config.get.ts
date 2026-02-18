import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getWooCommerceIntegration } from '~/server/utils/woocommerceAccess'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = query.siteId as string
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const integration = await getWooCommerceIntegration(pb, siteId)
  const config = integration?.config_json
  if (!config?.store_url) {
    return { configured: false, store_url: '' }
  }
  return {
    configured: true,
    store_url: (config.store_url as string).trim(),
    // Do not expose consumer_key/consumer_secret to client
  }
})
