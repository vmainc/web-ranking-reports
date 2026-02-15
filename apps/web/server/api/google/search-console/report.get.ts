import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getGAAccessToken } from '~/server/utils/gaAccess'

function defaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 27)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

interface GscRow {
  keys?: string[]
  clicks?: number
  impressions?: number
  ctr?: number
  position?: number
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = query.siteId as string
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const defaultRange = defaultDateRange()
  const startDate = (query.startDate as string) || defaultRange.startDate
  const endDate = (query.endDate as string) || defaultRange.endDate

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const { accessToken, integration } = await getGAAccessToken(pb, siteId)
  const gscSiteUrl = (integration.config_json as Record<string, unknown>)?.gsc_site_url as string | undefined
  if (!gscSiteUrl) {
    throw createError({ statusCode: 400, message: 'Select a Search Console property first.' })
  }

  const encodedSite = encodeURIComponent(gscSiteUrl)
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ['date'],
        rowLimit: 1000,
      }),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw createError({ statusCode: res.status, message: `Search Console API: ${res.status} ${text}` })
  }

  const data = (await res.json()) as { rows?: GscRow[] }
  const rawRows = data.rows ?? []

  let totalClicks = 0
  let totalImpressions = 0
  let weightedPosition = 0
  let positionCount = 0

  const rows = rawRows.map((r) => {
    const date = r.keys?.[0] ?? ''
    const clicks = Number(r.clicks ?? 0)
    const impressions = Number(r.impressions ?? 0)
    const ctr = Number(r.ctr ?? 0)
    const position = Number(r.position ?? 0)
    totalClicks += clicks
    totalImpressions += impressions
    if (impressions > 0) {
      weightedPosition += position * impressions
      positionCount += impressions
    } else if (position > 0) {
      positionCount += 1
      weightedPosition += position
    }
    return { date, clicks, impressions, ctr, position }
  })

  const summaryCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
  const summaryPosition = positionCount > 0 ? weightedPosition / positionCount : 0

  return {
    siteUrl: gscSiteUrl,
    startDate,
    endDate,
    rows,
    summary: {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: summaryCtr,
      position: summaryPosition,
    },
  }
})
