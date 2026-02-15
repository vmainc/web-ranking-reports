import { getGA4Context } from '~/server/utils/ga4Auth'
import { runReport, getCached, setCache, cacheKey } from '~/server/utils/ga4Helpers'

export default defineEventHandler(async (event) => {
  const ctx = await getGA4Context(event)
  const query = getQuery(event)
  const siteId = query.siteId as string
  const range = (query.range as string) || 'last_28_days'
  const key = cacheKey(siteId, 'retention', { range })
  const cached = getCached<{ newUsers: number; returningUsers: number }>(key)
  if (cached) return cached

  const dateRanges = [{ startDate: ctx.startDate, endDate: ctx.endDate }]
  const metrics = [{ name: 'newUsers' }, { name: 'activeUsers' }]
  try {
    const { totals, rows } = await runReport({
      propertyId: ctx.propertyId,
      accessToken: ctx.accessToken,
      dateRanges,
      metrics,
    })
    // GA4 may return aggregates in totals (one per date range) or in a single row when no dimensions
    const vals = totals[0]?.metricValues?.length
      ? totals[0].metricValues
      : rows[0]?.metricValues ?? [0, 0]
    const newUsers = Number(vals[0] ?? 0)
    const activeUsers = Number(vals[1] ?? 0)
    const returningUsers = Math.max(0, activeUsers - newUsers)
    const response = { newUsers, returningUsers }
    setCache(key, response)
    return response
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'GA4 retention failed'
    console.error('[ga4/retention]', msg)
    throw createError({ statusCode: 502, message: msg })
  }
})
