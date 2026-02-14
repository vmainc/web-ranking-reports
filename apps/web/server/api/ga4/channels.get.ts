import { getGA4Context } from '~/server/utils/ga4Auth'
import { runReport, getCached, setCache, cacheKey } from '~/server/utils/ga4Helpers'

export default defineEventHandler(async (event) => {
  const ctx = await getGA4Context(event)
  const query = getQuery(event)
  const siteId = query.siteId as string
  const range = (query.range as string) || 'last_28_days'
  const key = cacheKey(siteId, 'channels', { range })
  const cached = getCached<{ rows: Array<{ channel: string; sessions: number; users: number }> }>(key)
  if (cached) return cached

  const dateRanges = [{ startDate: ctx.startDate, endDate: ctx.endDate }]
  const metrics = [{ name: 'sessions' }, { name: 'activeUsers' }]
  const orderBy = [{ metric: { metricName: 'sessions' }, desc: true }]
  let rows: Array<{ channel: string; sessions: number; users: number }> = []
  try {
    const result = await runReport({
      propertyId: ctx.propertyId,
      accessToken: ctx.accessToken,
      dateRanges,
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics,
      orderBy,
    })
    rows = result.rows.map((r) => ({
      channel: r.dimensionValues[0] ?? '(not set)',
      sessions: r.metricValues[0] ?? 0,
      users: r.metricValues[1] ?? 0,
    }))
  } catch {
    rows = []
  }
  const response = { rows }
  setCache(key, response)
  return response
})
