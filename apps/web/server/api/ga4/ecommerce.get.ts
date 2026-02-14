import { getGA4Context } from '~/server/utils/ga4Auth'
import { runReport, getCached, setCache, cacheKey } from '~/server/utils/ga4Helpers'

export default defineEventHandler(async (event) => {
  const ctx = await getGA4Context(event)
  const query = getQuery(event)
  const siteId = query.siteId as string
  const range = (query.range as string) || 'last_28_days'
  const key = cacheKey(siteId, 'ecommerce', { range })
  const cached = getCached<{
    available: boolean
    summary?: { totalRevenue: number; purchases: number; averagePurchaseRevenue: number }
    topItems?: Array<{ itemName: string; itemRevenue: number; itemsPurchased: number }>
  }>(key)
  if (cached) return cached

  const dateRanges = [{ startDate: ctx.startDate, endDate: ctx.endDate }]
  let available = false
  let summary = { totalRevenue: 0, purchases: 0, averagePurchaseRevenue: 0 }
  let topItems: Array<{ itemName: string; itemRevenue: number; itemsPurchased: number }> = []

  try {
    const totalsResult = await runReport({
      propertyId: ctx.propertyId,
      accessToken: ctx.accessToken,
      dateRanges,
      metrics: [
        { name: 'totalRevenue' },
        { name: 'purchaseRevenue' },
        { name: 'transactions' },
      ],
    })
    const t = totalsResult.totals[0]?.metricValues ?? [0, 0, 0]
    const totalRevenue = t[0] ?? 0
    const purchaseRevenue = t[1] ?? 0
    const transactions = t[2] ?? 0
    if (totalRevenue > 0 || purchaseRevenue > 0 || transactions > 0) {
      available = true
      summary = {
        totalRevenue: totalRevenue || purchaseRevenue,
        purchases: transactions,
        averagePurchaseRevenue: transactions > 0 ? (totalRevenue || purchaseRevenue) / transactions : 0,
      }
    }

    if (available) {
      const itemsResult = await runReport({
        propertyId: ctx.propertyId,
        accessToken: ctx.accessToken,
        dateRanges,
        dimensions: [{ name: 'itemName' }],
        metrics: [{ name: 'itemRevenue' }, { name: 'itemsPurchased' }],
        limit: 10,
        orderBy: [{ metric: { metricName: 'itemRevenue' }, desc: true }],
      })
      topItems = itemsResult.rows.map((r) => ({
        itemName: r.dimensionValues[0] ?? '',
        itemRevenue: r.metricValues[0] ?? 0,
        itemsPurchased: Math.round(r.metricValues[1] ?? 0),
      }))
    }
  } catch {
    // ecommerce not enabled or no data
  }

  const response = { available, summary, topItems }
  setCache(key, response)
  return response
})
