import { getGA4Context } from '~/server/utils/ga4Auth'
import { runReport, getCached, setCache, cacheKey } from '~/server/utils/ga4Helpers'

export default defineEventHandler(async (event) => {
  const ctx = await getGA4Context(event)
  const query = getQuery(event)
  const siteId = query.siteId as string
  const range = (query.range as string) || 'last_28_days'
  const compare = (query.compare as string) || 'previous_period'
  const key = cacheKey(siteId, 'summary', { range, compare })
  const cached = getCached<ReturnType<typeof buildResponse>>(key)
  if (cached) return cached

  const dateRanges: Array<{ startDate: string; endDate: string }> = [
    { startDate: ctx.startDate, endDate: ctx.endDate },
  ]
  if (ctx.compareStartDate && ctx.compareEndDate) {
    dateRanges.push({ startDate: ctx.compareStartDate, endDate: ctx.compareEndDate })
  }

  const metrics = [
    { name: 'activeUsers' },
    { name: 'sessions' },
    { name: 'screenPageViews' },
    { name: 'engagedSessions' },
    { name: 'engagementRate' },
    { name: 'averageSessionDuration' },
  ]
  try {
    const { totals } = await runReport({
      propertyId: ctx.propertyId,
      accessToken: ctx.accessToken,
      dateRanges,
      metrics,
    })
    const current = totals[0]?.metricValues ?? [0, 0, 0, 0, 0, 0]
    const previous = totals[1]?.metricValues ?? current
    const response = buildResponse(current, previous)
    setCache(key, response)
    return response
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    if (err.message.includes('engagementRate') || err.message.includes('averageSessionDuration')) {
      const fallbackMetrics = [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ]
      const { totals } = await runReport({
        propertyId: ctx.propertyId,
        accessToken: ctx.accessToken,
        dateRanges,
        metrics: fallbackMetrics,
      })
      const cur = totals[0]?.metricValues ?? [0, 0, 0]
      const prev = totals[1]?.metricValues ?? cur
      const response = {
        current: {
          users: cur[0] ?? 0,
          sessions: cur[1] ?? 0,
          views: cur[2] ?? 0,
          engagedSessions: 0,
          engagementRate: 0,
          averageSessionDuration: 0,
        },
        previous: {
          users: prev[0] ?? 0,
          sessions: prev[1] ?? 0,
          views: prev[2] ?? 0,
          engagedSessions: 0,
          engagementRate: 0,
          averageSessionDuration: 0,
        },
        deltas: { users: 0, sessions: 0, views: 0, engagedSessions: 0, engagementRate: 0, averageSessionDuration: 0 },
      }
      setCache(key, response)
      return response
    }
    throw createError({ statusCode: 502, message: err.message })
  }
})

function buildResponse(
  current: number[],
  previous: number[]
): {
  current: Record<string, number>
  previous: Record<string, number>
  deltas: Record<string, number>
} {
  const [users, sessions, views, engagedSessions, engagementRate, averageSessionDuration] = current
  const [pUsers, pSessions, pViews, pEngaged, pEngRate, pAvgDur] = previous
  const delta = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : 100) : Math.round(((a - b) / b) * 1000) / 10)
  return {
    current: {
      users: users ?? 0,
      sessions: sessions ?? 0,
      views: views ?? 0,
      engagedSessions: engagedSessions ?? 0,
      engagementRate: engagementRate ?? 0,
      averageSessionDuration: averageSessionDuration ?? 0,
    },
    previous: {
      users: pUsers ?? 0,
      sessions: pSessions ?? 0,
      views: pViews ?? 0,
      engagedSessions: pEngaged ?? 0,
      engagementRate: pEngRate ?? 0,
      averageSessionDuration: pAvgDur ?? 0,
    },
    deltas: {
      users: delta(users ?? 0, pUsers ?? 0),
      sessions: delta(sessions ?? 0, pSessions ?? 0),
      views: delta(views ?? 0, pViews ?? 0),
      engagedSessions: delta(engagedSessions ?? 0, pEngaged ?? 0),
      engagementRate: delta(engagementRate ?? 0, pEngRate ?? 0),
      averageSessionDuration: delta(averageSessionDuration ?? 0, pAvgDur ?? 0),
    },
  }
}
