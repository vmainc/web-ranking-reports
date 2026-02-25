import { getGA4Context } from '~/server/utils/ga4Auth'
import { runReport, getCached, setCache, cacheKey } from '~/server/utils/ga4Helpers'

export default defineEventHandler(async (event) => {
  const ctx = await getGA4Context(event)
  const query = getQuery(event)
  const siteId = query.siteId as string
  const limit = Math.min(30, Math.max(1, Number(query.limit) || 15))
  const range = (query.range as string) || 'last_28_days'
  const key = cacheKey(siteId, 'cities', { limit: String(limit), range })
  const cached = getCached<{
    rows: Array<{ city: string; country: string; region?: string; users: number; sessions: number; views: number }>
  }>(key)
  if (cached) return cached

  const dateRanges = [{ startDate: ctx.startDate, endDate: ctx.endDate }]
  const metrics = [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }]
  const orderBy = [{ metric: { metricName: 'activeUsers' }, desc: true }]
  let rows: Array<{ city: string; country: string; region?: string; users: number; sessions: number; views: number }> = []
  try {
    const result = await runReport({
      propertyId: ctx.propertyId,
      accessToken: ctx.accessToken,
      dateRanges,
      // Include region so we can show US state for city breakdown.
      dimensions: [{ name: 'city' }, { name: 'country' }, { name: 'region' }],
      metrics,
      limit,
      orderBy,
    })
    rows = result.rows.map((r) => ({
      city: r.dimensionValues[0] ?? '(not set)',
      country: r.dimensionValues[1] ?? '',
      region: r.dimensionValues[2] ?? '',
      users: r.metricValues[0] ?? 0,
      sessions: r.metricValues[1] ?? 0,
      views: r.metricValues[2] ?? 0,
    }))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'GA4 cities failed'
    console.error('[ga4/cities]', msg)
    throw createError({ statusCode: 502, message: msg })
  }
  const response = { rows }
  if (rows.length > 0) setCache(key, response)
  return response
})
