import { getMethod, getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'

/**
 * Last backlinks profile saved when the user ran POST …/backlinks/fetch (no live DataForSEO calls).
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
  const snap = (row as { backlinks_snapshot?: unknown }).backlinks_snapshot
  if (snap && typeof snap === 'object') return snap
  return null
})
