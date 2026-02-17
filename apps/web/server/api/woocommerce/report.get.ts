import { getAdminPb, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import {
  getWooCommerceConfig,
  fetchOrdersInRange,
  aggregateOrders,
} from '~/server/utils/woocommerceAccess'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = query.siteId as string
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await assertSiteOwnership(pb, siteId, userId)

  const config = await getWooCommerceConfig(pb, siteId)

  let startDate = (query.startDate as string) || ''
  let endDate = (query.endDate as string) || ''
  if (!startDate || !endDate) {
    const endD = new Date()
    const startD = new Date()
    startD.setDate(startD.getDate() - 30)
    startDate = startDate || startD.toISOString().slice(0, 10)
    endDate = endDate || endD.toISOString().slice(0, 10)
  }

  const orders = await fetchOrdersInRange(config, startDate, endDate)
  const report = aggregateOrders(orders)

  return {
    startDate,
    endDate,
    ...report,
  }
})
