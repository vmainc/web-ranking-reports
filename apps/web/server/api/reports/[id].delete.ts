import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'DELETE') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const reportId = getRouterParam(event, 'id')
  if (!reportId) throw createError({ statusCode: 400, message: 'Report id required' })

  const pb = getAdminPb()
  await adminAuth(pb)

  const report = await pb.collection('reports').getOne(reportId)
  const siteId = typeof report.site === 'string' ? report.site : (report.site as { id?: string })?.id
  if (!siteId) throw createError({ statusCode: 404, message: 'Report not found' })

  await assertSiteOwnership(pb, siteId, userId)

  await pb.collection('reports').delete(reportId)
  return { ok: true }
})
