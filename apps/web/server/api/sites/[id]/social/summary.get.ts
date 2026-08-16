import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess, extractPocketBaseRelationId } from '~/server/utils/workspace'
import { getFacebookSocialSummary } from '~/server/services/social/facebookSummary'

function dateParam(v: unknown, fallback: string): string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return fallback
  return v
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const query = getQuery(event)
  const end = dateParam(query.end, new Date().toISOString().slice(0, 10))
  const startDefault = new Date(end + 'T00:00:00Z')
  startDefault.setUTCDate(startDefault.getUTCDate() - 27)
  const start = dateParam(query.start, startDefault.toISOString().slice(0, 10))

  const pb = getAdminPb()
  await adminAuth(pb)
  const access = await assertSiteAccess(pb, siteId, userId, false)
  const ownerId = extractPocketBaseRelationId((access.site as { user?: unknown }).user)

  return getFacebookSocialSummary(pb, { siteId, agencyOwnerId: ownerId, range: { start, end } })
})
