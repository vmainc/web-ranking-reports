import { getGA4Context } from '~/server/utils/ga4Auth'
import { runReport, getCached, setCache, cacheKey } from '~/server/utils/ga4Helpers'

/** Sunday–Saturday week (UTC) containing the given YYYY-MM-DD (GA4 weekly cohort alignment). */
function weekBoundsUtcSunday(isoYmd: string): { start: string; end: string } {
  const d = new Date(`${isoYmd}T12:00:00.000Z`)
  const dow = d.getUTCDay()
  const sun = new Date(d)
  sun.setUTCDate(d.getUTCDate() - dow)
  const sat = new Date(sun)
  sat.setUTCDate(sun.getUTCDate() + 6)
  return { start: sun.toISOString().slice(0, 10), end: sat.toISOString().slice(0, 10) }
}

function parseCohortNthWeek(val: string): number {
  const n = parseInt(String(val).trim(), 10)
  return Number.isNaN(n) ? 0 : n
}

export type RetentionCurvePoint = {
  weekOffset: number
  activeUsers: number
  totalUsers: number
  retainedFraction: number
  purchaseRevenue: number
  keyEvents: number
}

export type CohortLtvSummary = {
  cohortUsers: number
  totalPurchaseRevenue: number
  revenuePerUser: number | null
  totalKeyEvents: number
  keyEventsPerUser: number | null
}

export default defineEventHandler(async (event) => {
  const ctx = await getGA4Context(event)
  const query = getQuery(event)
  const siteId = query.siteId as string
  const range = (query.range as string) || 'last_28_days'
  const key = cacheKey(siteId, 'retention', { range })
  const cached = getCached<{
    newUsers: number
    returningUsers: number
    newAvgEngagementSeconds: number | null
    returningAvgEngagementSeconds: number | null
    retentionCurve: RetentionCurvePoint[] | null
    cohortLtv: CohortLtvSummary | null
    cohortNote?: string | null
  }>(key)
  if (cached) return cached

  const dateRanges = [{ startDate: ctx.startDate, endDate: ctx.endDate }]
  try {
    // newVsReturning + activeUsers + userEngagementDuration (seconds) → avg engagement per user in each group
    const { rows } = await runReport({
      propertyId: ctx.propertyId,
      accessToken: ctx.accessToken,
      dateRanges,
      dimensions: [{ name: 'newVsReturning' }],
      metrics: [{ name: 'activeUsers' }, { name: 'userEngagementDuration' }],
    })
    let newUsers = 0
    let returningUsers = 0
    let newEngagementSeconds = 0
    let returningEngagementSeconds = 0
    for (const row of rows) {
      const type = (row.dimensionValues[0] ?? '').toLowerCase()
      const users = Number(row.metricValues[0] ?? 0)
      const durationSec = Number(row.metricValues[1] ?? 0)
      if (type === 'new') {
        newUsers += users
        newEngagementSeconds += durationSec
      } else if (type === 'returning' || type === 'established') {
        returningUsers += users
        returningEngagementSeconds += durationSec
      }
    }
    const newAvgEngagementSeconds = newUsers > 0 ? newEngagementSeconds / newUsers : null
    const returningAvgEngagementSeconds = returningUsers > 0 ? returningEngagementSeconds / returningUsers : null

    let retentionCurve: RetentionCurvePoint[] | null = null
    let cohortLtv: CohortLtvSummary | null = null
    let cohortNote: string | null = null

    const { start: cohortStart, end: cohortEnd } = weekBoundsUtcSunday(ctx.startDate)
    const metricSets: Array<Array<{ name: string }>> = [
      [
        { name: 'cohortActiveUsers' },
        { name: 'cohortTotalUsers' },
        { name: 'purchaseRevenue' },
        { name: 'keyEvents' },
      ],
      [{ name: 'cohortActiveUsers' }, { name: 'cohortTotalUsers' }, { name: 'purchaseRevenue' }],
      [{ name: 'cohortActiveUsers' }, { name: 'cohortTotalUsers' }],
    ]

    for (let mi = 0; mi < metricSets.length; mi++) {
      const metrics = metricSets[mi]
      try {
        const cr = await runReport({
          propertyId: ctx.propertyId,
          accessToken: ctx.accessToken,
          dimensions: [{ name: 'cohort' }, { name: 'cohortNthWeek' }],
          metrics,
          cohortSpec: {
            cohorts: [
              {
                name: 'weekly_acquired',
                dimension: 'firstSessionDate',
                dateRange: { startDate: cohortStart, endDate: cohortEnd },
              },
            ],
            cohortsRange: { granularity: 'WEEKLY', startOffset: 0, endOffset: 6 },
          },
        })
        const hasRev = metrics.some((m) => m.name === 'purchaseRevenue')
        const hasKeys = metrics.some((m) => m.name === 'keyEvents')
        const curve: RetentionCurvePoint[] = []
        let totalRev = 0
        let totalKeys = 0
        for (const row of cr.rows) {
          const weekOffset = parseCohortNthWeek(row.dimensionValues[1] ?? '0')
          const active = Number(row.metricValues[0] ?? 0)
          const total = Number(row.metricValues[1] ?? 0)
          const rev = hasRev ? Number(row.metricValues[2] ?? 0) : 0
          const keys = hasKeys ? Number(row.metricValues[3] ?? 0) : 0
          totalRev += rev
          totalKeys += keys
          curve.push({
            weekOffset,
            activeUsers: active,
            totalUsers: total,
            retainedFraction: total > 0 ? active / total : 0,
            purchaseRevenue: rev,
            keyEvents: keys,
          })
        }
        curve.sort((a, b) => a.weekOffset - b.weekOffset)
        if (curve.length) {
          retentionCurve = curve
          cohortNote = `Cohort: first session ${cohortStart}–${cohortEnd} (UTC week); weekly retention after acquisition.`
          const w0 = curve.find((p) => p.weekOffset === 0)
          const cohortUsers =
            w0 && w0.totalUsers > 0 ? w0.totalUsers : Math.max(0, ...curve.map((p) => p.totalUsers))
          if (cohortUsers > 0) {
            cohortLtv = {
              cohortUsers,
              totalPurchaseRevenue: totalRev,
              revenuePerUser: hasRev ? totalRev / cohortUsers : null,
              totalKeyEvents: totalKeys,
              keyEventsPerUser: hasKeys ? totalKeys / cohortUsers : null,
            }
          }
        }
        break
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (mi === metricSets.length - 1) {
          cohortNote = `Cohort retention unavailable: ${msg.slice(0, 240)}`
        }
      }
    }

    const response = {
      newUsers,
      returningUsers,
      newAvgEngagementSeconds,
      returningAvgEngagementSeconds,
      retentionCurve,
      cohortLtv,
      cohortNote,
    }
    setCache(key, response)
    return response
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'GA4 retention failed'
    console.error('[ga4/retention]', msg)
    throw createError({ statusCode: 502, message: msg })
  }
})
