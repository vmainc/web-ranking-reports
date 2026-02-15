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
  const metrics = [{ name: 'newUsers' }, { name: 'returningUsers' }]
  try {
    const { totals } = await runReport({
      propertyId: ctx.propertyId,
      accessToken: ctx.accessToken,
      dateRanges,
      metrics,
    })
    const vals = totals[0]?.metricValues ?? [0, 0]
    const response = { newUsers: vals[0] ?? 0, returningUsers: vals[1] ?? 0 }
    setCache(key, response)
    return response
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'GA4 retention failed'
    console.error('[ga4/retention]', msg)
    throw createError({ statusCode: 502, message: msg })
  }
})
