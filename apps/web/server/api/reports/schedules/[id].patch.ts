import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'

/** PATCH /api/reports/schedules/:id — body: { is_active: boolean } */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const body = (await readBody(event).catch(() => ({}))) as { is_active?: boolean }
  if (typeof body.is_active !== 'boolean') {
    throw createError({ statusCode: 400, message: 'is_active boolean required' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)

  const existing = await pb.collection('report_schedules').getOne<{ site?: string }>(id)
  const siteId = typeof existing.site === 'string' ? existing.site : ''
  if (!siteId) throw createError({ statusCode: 404, message: 'Schedule not found' })

  await assertSiteAccess(pb, siteId, userId, true)

  const updated = await pb.collection('report_schedules').update(id, { is_active: body.is_active })
  return { schedule: updated }
})
