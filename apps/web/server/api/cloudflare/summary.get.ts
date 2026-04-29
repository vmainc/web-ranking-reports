import { getQuery } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = typeof query.siteId === 'string' ? query.siteId.trim() : ''
  const zoneId = typeof query.zoneId === 'string' ? query.zoneId.trim() : ''

  const pb = getAdminPb()
  await adminAuth(pb)

  let domain = ''
  if (siteId) {
    const { site } = await assertSiteAccess(pb, siteId, userId, false)
    domain = String((site as { domain?: string })?.domain || '').trim().toLowerCase()
  }

  let filter = `user = "${userId}"`
  if (zoneId) filter += ` && zone_id = "${zoneId.replace(/"/g, '\\"')}"`
  if (domain) filter += ` && domain ~ "${domain.replace(/"/g, '\\"')}"`

  const rows = await pb.collection('cloudflare_data').getFullList<{
    zone_id?: string
    domain?: string
    requests?: number
    bandwidth?: number
    threats?: number
    cached_percent?: number
    date?: string
  }>({ filter, sort: '-date', perPage: 200 }).catch(() => [])

  if (!rows.length) {
    return {
      rows: [],
      summary: { requests: 0, bandwidth: 0, threats: 0, cached_percent: 0 },
      message: 'No data available.',
    }
  }

  const summary = rows.reduce<{ requests: number; bandwidth: number; threats: number; cached_percent: number }>(
    (acc, r) => {
      acc.requests += Number(r.requests ?? 0) || 0
      acc.bandwidth += Number(r.bandwidth ?? 0) || 0
      acc.threats += Number(r.threats ?? 0) || 0
      acc.cached_percent += Number(r.cached_percent ?? 0) || 0
      return acc
    },
    { requests: 0, bandwidth: 0, threats: 0, cached_percent: 0 },
  )
  summary.cached_percent = rows.length ? summary.cached_percent / rows.length : 0

  return { rows, summary }
})

