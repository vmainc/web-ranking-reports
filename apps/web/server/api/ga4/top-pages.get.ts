import { getGA4Context } from '~/server/utils/ga4Auth'
import { runReport, getCached, setCache, cacheKey } from '~/server/utils/ga4Helpers'

export default defineEventHandler(async (event) => {
  const ctx = await getGA4Context(event)
  const query = getQuery(event)
  const siteId = query.siteId as string
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10))
  const range = (query.range as string) || 'last_28_days'
  const key = cacheKey(siteId, 'top-pages', { limit: String(limit), range })
  const cached = getCached<{ rows: Array<{ pagePath: string; views: number; users: number; engagementTime: number; keyEvents: number }> }>(key)
  if (cached) return cached

  const dateRanges = [{ startDate: ctx.startDate, endDate: ctx.endDate }]
  const metrics = [
    { name: 'screenPageViews' },
    { name: 'activeUsers' },
    { name: 'averageEngagementTime' },
  ]
  const orderBy = [{ metric: { metricName: 'screenPageViews' }, desc: true }]
  let rows: Array<{ pagePath: string; views: number; users: number; engagementTime: number; keyEvents: number }> = []
  try {
    const result = await runReport({
      propertyId: ctx.propertyId,
      accessToken: ctx.accessToken,
      dateRanges,
      dimensions: [{ name: 'pagePath' }],
      metrics,
      limit,
      orderBy,
    })
    rows = result.rows.map((r) => ({
      pagePath: r.dimensionValues[0] ?? '',
      views: r.metricValues[0] ?? 0,
      users: r.metricValues[1] ?? 0,
      engagementTime: Math.round(r.metricValues[2] ?? 0),
      keyEvents: 0,
    }))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'GA4 top-pages failed'
    console.error('[ga4/top-pages]', msg)
    throw createError({ statusCode: 502, message: msg })
  }
  const response = { rows }
  if (rows.length > 0) setCache(key, response)
  return response
})
