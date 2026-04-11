import { getMethod } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'

/** DELETE /api/reports/schedules/:id */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'DELETE') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const pb = getAdminPb()
  await adminAuth(pb)

  const existing = await pb.collection('report_schedules').getOne<{ site?: string }>(id)
  const siteId = typeof existing.site === 'string' ? existing.site : ''
  if (!siteId) throw createError({ statusCode: 404, message: 'Schedule not found' })

  await assertSiteAccess(pb, siteId, userId, true)

  await pb.collection('report_schedules').delete(id)
  return { ok: true as const }
})
