import { getGA4Context } from '~/server/utils/ga4Auth'
import { runReport, getCached, setCache, cacheKey } from '~/server/utils/ga4Helpers'

export default defineEventHandler(async (event) => {
  const ctx = await getGA4Context(event)
  const query = getQuery(event)
  const siteId = query.siteId as string
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10))
  const range = (query.range as string) || 'last_28_days'
  const key = cacheKey(siteId, 'events', { limit: String(limit), range })
  const cached = getCached<{ rows: Array<{ eventName: string; eventCount: number; totalUsers: number }> }>(key)
  if (cached) return cached

  const dateRanges = [{ startDate: ctx.startDate, endDate: ctx.endDate }]
  const metrics = [{ name: 'eventCount' }, { name: 'totalUsers' }]
  const orderBy = [{ metric: { metricName: 'eventCount' }, desc: true }]
  let rows: Array<{ eventName: string; eventCount: number; totalUsers: number }> = []
  try {
    const result = await runReport({
      propertyId: ctx.propertyId,
      accessToken: ctx.accessToken,
      dateRanges,
      dimensions: [{ name: 'eventName' }],
      metrics,
      limit,
      orderBy,
    })
    rows = result.rows.map((r) => ({
      eventName: r.dimensionValues[0] ?? '',
      eventCount: r.metricValues[0] ?? 0,
      totalUsers: r.metricValues[1] ?? 0,
    }))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'GA4 events failed'
    console.error('[ga4/events]', msg)
    throw createError({ statusCode: 502, message: msg })
  }
  const response = { rows }
  if (rows.length > 0) setCache(key, response)
  return response
})
