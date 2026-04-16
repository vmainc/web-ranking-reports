import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getSiteAuditResult } from '~/server/utils/claude'
import { assertSiteAccess } from '~/server/utils/workspace'

export default defineEventHandler(async (event) => {
  const siteId = getRouterParam(event, 'siteId')
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteAccess(pb, siteId, userId, false)
  const result = await getSiteAuditResult(pb, siteId)
  return { result }
})
