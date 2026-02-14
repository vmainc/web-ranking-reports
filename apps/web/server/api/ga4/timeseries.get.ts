import { getGA4Context } from '~/server/utils/ga4Auth'
import { runReport, getCached, setCache, cacheKey } from '~/server/utils/ga4Helpers'

export default defineEventHandler(async (event) => {
  const ctx = await getGA4Context(event)
  const query = getQuery(event)
  const siteId = query.siteId as string
  const metric = (query.metric as string) || 'sessions'
  const range = (query.range as string) || 'last_28_days'
  const compare = (query.compare as string) || 'previous_period'
  const key = cacheKey(siteId, 'timeseries', { metric, range, compare })
  const cached = getCached<{ dates: string[]; values: number[]; compareValues: number[] }>(key)
  if (cached) return cached

  const dateRanges: Array<{ startDate: string; endDate: string }> = [
    { startDate: ctx.startDate, endDate: ctx.endDate },
  ]
  if (ctx.compareStartDate && ctx.compareEndDate) {
    dateRanges.push({ startDate: ctx.compareStartDate, endDate: ctx.compareEndDate })
  }

  const { rows, totals } = await runReport({
    propertyId: ctx.propertyId,
    accessToken: ctx.accessToken,
    dateRanges,
    dimensions: [{ name: 'date' }],
    metrics: [{ name: metric === 'views' ? 'screenPageViews' : metric }],
  })

  const dates = rows.map((r) => r.dimensionValues[0] ?? '')
  const values = rows.map((r) => r.metricValues[0] ?? 0)
  const compareValues = rows.map((r) => r.metricValues[1] ?? 0)
  if (dates.length === 0 && totals[0]) {
    dates.push(ctx.startDate)
    values.push(totals[0].metricValues[0] ?? 0)
    compareValues.push(0)
  }

  const response = { dates, values, compareValues }
  setCache(key, response)
  return response
})
