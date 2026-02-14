import { getGA4Context } from '~/server/utils/ga4Auth'
import { runReport, getCached, setCache, cacheKey } from '~/server/utils/ga4Helpers'

export default defineEventHandler(async (event) => {
  const ctx = await getGA4Context(event)
  const query = getQuery(event)
  const siteId = query.siteId as string
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10))
  const range = (query.range as string) || 'last_28_days'
  const key = cacheKey(siteId, 'landing-pages', { limit: String(limit), range })
  const cached = getCached<{ rows: Array<{ landingPage: string; sessions: number; engagedSessions: number; engagementRate: number }> }>(key)
  if (cached) return cached

  const dateRanges = [{ startDate: ctx.startDate, endDate: ctx.endDate }]
  const metrics = [
    { name: 'sessions' },
    { name: 'engagedSessions' },
    { name: 'engagementRate' },
  ]
  const orderBy = [{ metric: { metricName: 'sessions' }, desc: true }]
  let rows: Array<{ landingPage: string; sessions: number; engagedSessions: number; engagementRate: number }> = []
  try {
    const result = await runReport({
      propertyId: ctx.propertyId,
      accessToken: ctx.accessToken,
      dateRanges,
      dimensions: [{ name: 'landingPage' }],
      metrics,
      limit,
      orderBy,
    })
    rows = result.rows.map((r) => ({
      landingPage: r.dimensionValues[0] ?? '',
      sessions: r.metricValues[0] ?? 0,
      engagedSessions: r.metricValues[1] ?? 0,
      engagementRate: (r.metricValues[2] ?? 0) * 100,
    }))
  } catch {
    rows = []
  }
  const response = { rows }
  setCache(key, response)
  return response
})
