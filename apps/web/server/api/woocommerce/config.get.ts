import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { getWooCommerceIntegration } from '~/server/utils/woocommerceAccess'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if ((config.public as { woocommerceEnabled?: boolean }).woocommerceEnabled === false) {
    throw createError({ statusCode: 404, message: 'WooCommerce is disabled' })
  }
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = query.siteId as string
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteAccess(pb, siteId, userId, false)

  const integration = await getWooCommerceIntegration(pb, siteId)
  const wooConfig = integration?.config_json as { store_url?: string; consumer_key?: string; consumer_secret?: string } | undefined
  const hasKeys = wooConfig?.consumer_key?.trim() && wooConfig?.consumer_secret?.trim()
  if (!hasKeys) {
    return { configured: false, store_url: '' }
  }
  const storeUrl = wooConfig?.store_url?.trim()
  return {
    configured: true,
    store_url: storeUrl || '(uses this site’s domain)',
    // Do not expose consumer_key/consumer_secret to client
  }
})
