import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getGAAccessToken } from '~/server/utils/gaAccess'

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
  const propertyId = integration.config_json?.property_id
  if (!propertyId) {
    throw createError({ statusCode: 400, message: 'Select a GA4 property first in Integrations.' })
  }

  const start = startDate || (() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) })()
  const end = endDate || new Date().toISOString().slice(0, 10)

  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('GA runReport', res.status, text)
    throw createError({ statusCode: res.status, message: 'Failed to load report data.' })
  }

  const data = (await res.json()) as {
    rows?: Array<{
      dimensionValues?: Array<{ value?: string }>
      metricValues?: Array<{ value?: string }>
    }>
    totals?: Array<{ metricValues?: Array<{ value?: string }> }>
  }

  const rows = (data.rows ?? []).map((row) => ({
    date: row.dimensionValues?.[0]?.value ?? '',
    activeUsers: Number(row.metricValues?.[0]?.value ?? 0),
    sessions: Number(row.metricValues?.[1]?.value ?? 0),
    screenPageViews: Number(row.metricValues?.[2]?.value ?? 0),
  }))

  const totals = data.totals?.[0]?.metricValues
  let summary: { activeUsers: number; sessions: number; screenPageViews: number } | null = totals
    ? {
        activeUsers: Number(totals[0]?.value ?? 0),
        sessions: Number(totals[1]?.value ?? 0),
        screenPageViews: Number(totals[2]?.value ?? 0),
      }
    : null

  if (!summary && rows.length > 0) {
    summary = rows.reduce(
      (acc, row) => ({
        activeUsers: acc.activeUsers + row.activeUsers,
        sessions: acc.sessions + row.sessions,
        screenPageViews: acc.screenPageViews + row.screenPageViews,
      }),
      { activeUsers: 0, sessions: 0, screenPageViews: 0 }
    )
  }

  return {
    propertyId,
    startDate: start,
    endDate: end,
    rows,
    summary,
  }
})
