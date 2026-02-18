import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import {
  getWooCommerceIntegration,
  type WooCommerceIntegrationRecord,
} from '~/server/utils/woocommerceAccess'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as {
    siteId?: string
    store_url?: string
    consumer_key?: string
    consumer_secret?: string
  }
  const siteId = body?.siteId
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const storeUrl = typeof body.store_url === 'string' ? body.store_url.trim() : ''
  let consumerKey = typeof body.consumer_key === 'string' ? body.consumer_key.trim() : ''
  let consumerSecret = typeof body.consumer_secret === 'string' ? body.consumer_secret.trim() : ''

  if (!storeUrl) throw createError({ statusCode: 400, message: 'Store URL is required.' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const url = storeUrl.replace(/\/+$/, '')
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw createError({ statusCode: 400, message: 'Store URL must start with http:// or https://' })
  }

  let integration = await getWooCommerceIntegration(pb, siteId)
  if (!integration) {
    if (!consumerKey || !consumerSecret) {
      throw createError({ statusCode: 400, message: 'Consumer key and consumer secret are required for new setup.' })
    }
    const created = await pb.collection('integrations').create<WooCommerceIntegrationRecord>({
      site: siteId,
      provider: 'woocommerce',
      status: 'connected',
      config_json: {
        store_url: url,
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
      },
    })
    return { ok: true, id: created.id }
  }

  const existing = integration.config_json as { consumer_key?: string; consumer_secret?: string } | undefined
  if (!consumerKey) consumerKey = existing?.consumer_key ?? ''
  if (!consumerSecret) consumerSecret = existing?.consumer_secret ?? ''
  if (!consumerKey || !consumerSecret) {
    throw createError({ statusCode: 400, message: 'Consumer key and consumer secret are required.' })
  }

  await pb.collection('integrations').update(integration.id, {
    status: 'connected',
    connected_at: new Date().toISOString(),
    config_json: {
      ...integration.config_json,
      store_url: url,
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    },
  })
  return { ok: true, id: integration.id }
})
