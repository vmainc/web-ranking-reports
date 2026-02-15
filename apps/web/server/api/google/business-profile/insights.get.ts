import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getGAAccessToken } from '~/server/utils/gaAccess'

const DAILY_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
  'BUSINESS_DIRECTION_REQUESTS',
  'CALL_CLICKS',
  'WEBSITE_CLICKS',
  'BUSINESS_CONVERSATIONS',
] as const

function parseDateRange(startDate: string, endDate: string): { start: { year: number; month: number; day: number }; end: { year: number; month: number; day: number } } {
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  return {
    start: { year: sy!, month: sm!, day: sd! },
    end: { year: ey!, month: em!, day: ed! },
  }
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = query.siteId as string
  const startDate = (query.startDate as string) || ''
  const endDate = (query.endDate as string) || ''
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const { accessToken, integration } = await getGAAccessToken(pb, siteId)
  const locationId = (integration.config_json as Record<string, unknown>)?.gbp_location_id as string | undefined
  if (!locationId) throw createError({ statusCode: 400, message: 'Select a Business Profile location first.' })

  const end = endDate ? new Date(endDate) : new Date()
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 27 * 24 * 60 * 60 * 1000)
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)
  const { start: s, end: e } = parseDateRange(startStr, endStr)

  const params = new URLSearchParams()
  DAILY_METRICS.forEach((m) => params.append('dailyMetrics', m))
  params.set('dailyRange.start_date.year', String(s.year))
  params.set('dailyRange.start_date.month', String(s.month))
  params.set('dailyRange.start_date.day', String(s.day))
  params.set('dailyRange.end_date.year', String(e.year))
  params.set('dailyRange.end_date.month', String(e.month))
  params.set('dailyRange.end_date.day', String(e.day))

  const url = `https://businessprofileperformance.googleapis.com/v1/locations/${encodeURIComponent(locationId)}:fetchMultiDailyMetricsTimeSeries?${params.toString()}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw createError({ statusCode: res.status, message: `Performance API: ${res.status} ${text.slice(0, 200)}` })
  }

  const data = (await res.json()) as {
    multiDailyMetricTimeSeries?: Array<{
      dailyMetricTimeSeries?: Array<{
        dailyMetric?: string
        timeSeries?: { datedValues?: Array<{ date?: { year?: number; month?: number; day?: number }; value?: string }> }
      }>
    }>
  }

  const byMetric: Record<string, Array<{ date: string; value: number }>> = {}
  const totals: Record<string, number> = {}

  for (const series of data.multiDailyMetricTimeSeries ?? []) {
    for (const dms of series.dailyMetricTimeSeries ?? []) {
      const metric = dms.dailyMetric ?? 'UNKNOWN'
      const values = (dms.timeSeries?.datedValues ?? []).map((dv) => {
        const d = dv.date
        const dateStr = d ? `${d.year}-${String(d.month!).padStart(2, '0')}-${String(d.day!).padStart(2, '0')}` : ''
        const value = parseInt(dv.value ?? '0', 10) || 0
        totals[metric] = (totals[metric] ?? 0) + value
        return { date: dateStr, value }
      })
      byMetric[metric] = values
    }
  }

  const allDates = new Set<string>()
  Object.values(byMetric).forEach((arr) => arr.forEach((p) => allDates.add(p.date)))
  const sortedDates = Array.from(allDates).sort()

  const rows = sortedDates.map((date) => {
    const row: Record<string, number | string> = { date }
    for (const m of DAILY_METRICS) {
      const arr = byMetric[m]
      const point = arr?.find((p) => p.date === date)
      row[m] = point?.value ?? 0
    }
    return row
  })

  return {
    startDate: startStr,
    endDate: endStr,
    totals,
    byMetric,
    rows,
  }
})
