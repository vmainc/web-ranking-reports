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
  const config = integration?.config_json as { store_url?: string; consumer_key?: string; consumer_secret?: string } | undefined
  const hasKeys = config?.consumer_key?.trim() && config?.consumer_secret?.trim()
  if (!hasKeys) {
    return { configured: false, store_url: '' }
  }
  const storeUrl = config?.store_url?.trim()
  return {
    configured: true,
    store_url: storeUrl || '(uses this site’s domain)',
    // Do not expose consumer_key/consumer_secret to client
  }
})
