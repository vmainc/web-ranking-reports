import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const reportId = getRouterParam(event, 'id')
  if (!reportId) throw createError({ statusCode: 400, message: 'Report id required' })

  const body = (await readBody(event).catch(() => ({}))) as {
    payload_json?: Record<string, unknown>
    period_start?: string
    period_end?: string
  }

  const pb = getAdminPb()
  await adminAuth(pb)

  const report = await pb.collection('reports').getOne(reportId)
  const siteId = typeof report.site === 'string' ? report.site : (report.site as { id?: string })?.id
  if (!siteId) throw createError({ statusCode: 404, message: 'Report not found' })

  const site = await pb.collection('sites').getOne(siteId)
  if ((site as { user?: string }).user !== userId) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const updates: Record<string, unknown> = {}
  if (body.payload_json !== undefined) updates.payload_json = body.payload_json
  if (body.period_start !== undefined) updates.period_start = body.period_start
  if (body.period_end !== undefined) updates.period_end = body.period_end
  if (Object.keys(updates).length === 0) return report

  const updated = await pb.collection('reports').update(reportId, updates)
  return updated
})
