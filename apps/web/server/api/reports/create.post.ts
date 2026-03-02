import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { siteId?: string }
  const siteId = body?.siteId
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const now = new Date().toISOString()
  const report = await pb.collection('reports').create({
    site: siteId,
    type: 'full',
    period_start: now.slice(0, 10),
    period_end: now.slice(0, 10),
    payload_json: {},
  })

  return {
    report: {
      id: report.id,
      site: report.site,
      type: report.type,
      period_start: (report as { period_start?: string }).period_start,
      period_end: (report as { period_end?: string }).period_end,
      created: (report as { created?: string }).created,
    },
  }
})
