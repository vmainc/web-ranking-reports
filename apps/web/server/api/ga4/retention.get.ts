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
  try {
    // Use newVsReturning dimension so GA4 returns exact new vs returning counts (matches GA UI)
    const { rows } = await runReport({
      propertyId: ctx.propertyId,
      accessToken: ctx.accessToken,
      dateRanges,
      dimensions: [{ name: 'newVsReturning' }],
      metrics: [{ name: 'activeUsers' }],
    })
    let newUsers = 0
    let returningUsers = 0
    for (const row of rows) {
      const type = (row.dimensionValues[0] ?? '').toLowerCase()
      const count = Number(row.metricValues[0] ?? 0)
      if (type === 'new') newUsers += count
      else if (type === 'returning' || type === 'established') returningUsers += count
    }
    const response = { newUsers, returningUsers }
    setCache(key, response)
    return response
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'GA4 retention failed'
    console.error('[ga4/retention]', msg)
    throw createError({ statusCode: 502, message: msg })
  }
})
