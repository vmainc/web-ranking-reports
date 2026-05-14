import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getUserPlan } from '~/server/services/subscriptions'
import { extractPocketBaseRelationId } from '~/server/utils/workspace'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const reportId = getRouterParam(event, 'id')
  if (!reportId) throw createError({ statusCode: 400, message: 'Report id required' })

  const pb = getAdminPb()
  await adminAuth(pb)

  const report = await pb.collection('reports').getOne(reportId, { expand: 'site' })
  const siteId = typeof report.site === 'string' ? report.site : (report.site as { id?: string })?.id
  if (!siteId) throw createError({ statusCode: 404, message: 'Report not found' })

  await assertSiteOwnership(pb, siteId, userId)

  const expandedSite = report.expand?.site as { user?: unknown } | undefined
  let ownerId = expandedSite ? extractPocketBaseRelationId(expandedSite.user) : ''
  if (!ownerId) {
    const siteRow = await pb.collection('sites').getOne(siteId, { fields: 'user' })
    ownerId = extractPocketBaseRelationId((siteRow as { user?: unknown }).user)
  }
  const workspaceOwnerPlan = await getUserPlan(pb, ownerId || userId)

  return { ...report, workspaceOwnerPlan }
})
