import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { resolveSiteBacklinksSnapshot } from '~/server/utils/siteBacklinksSnapshot'

/**
 * On-demand Backlinks API bundle (5 DataForSEO live calls). Same credentials as rank tracking.
 */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const { site } = await assertSiteAccess(pb, siteId, userId, false)

  return await resolveSiteBacklinksSnapshot(pb, siteId, site, { refresh: true })
})
