import { getMethod, getQuery, getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { resolveSiteBacklinksSnapshot } from '~/server/utils/siteBacklinksSnapshot'

/**
 * Cached backlinks profile from the site record.
 * Query: `fetchIfMissing=1` loads from DataForSEO when empty; `refresh=1` always refetches.
 * Optional `maxAgeDays` (with fetchIfMissing) refreshes stale snapshots.
 */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'GET') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteAccess(pb, siteId, userId, false)

  const row = await pb.collection('sites').getOne(siteId)
  const query = getQuery(event)
  const truthy = (v: unknown) => v === '1' || v === 'true' || v === true
  const refresh = truthy(query.refresh)
  const fetchIfMissing = truthy(query.fetchIfMissing)
  const maxAgeDaysRaw = query.maxAgeDays
  const maxAgeDays =
    typeof maxAgeDaysRaw === 'string' && maxAgeDaysRaw.trim()
      ? Math.max(0, Number(maxAgeDaysRaw) || 0)
      : typeof maxAgeDaysRaw === 'number'
        ? Math.max(0, maxAgeDaysRaw)
        : 0

  return await resolveSiteBacklinksSnapshot(pb, siteId, row, {
    refresh,
    fetchIfMissing,
    maxAgeDays: fetchIfMissing && maxAgeDays > 0 ? maxAgeDays : undefined,
  })
})
