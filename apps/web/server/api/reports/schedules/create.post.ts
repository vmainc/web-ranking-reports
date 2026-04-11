import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { firstNextRunUtcFromStart, parseIsoOrThrow, type ReportScheduleFrequency } from '~/server/utils/reportScheduleTime'

/** POST /api/reports/schedules/create */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as {
    siteId?: string
    frequency?: string
    startAt?: string
  }
  const siteId = typeof body.siteId === 'string' ? body.siteId.trim() : ''
  const frequency = body.frequency as ReportScheduleFrequency
  const startAtRaw = typeof body.startAt === 'string' ? body.startAt.trim() : ''

  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })
  if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
    throw createError({ statusCode: 400, message: 'frequency must be daily, weekly, or monthly' })
  }
  if (!startAtRaw) throw createError({ statusCode: 400, message: 'startAt (ISO date/time) required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteAccess(pb, siteId, userId, true)

  const startDate = parseIsoOrThrow(startAtRaw)
  const startIso = startDate.toISOString()
  const nextRun = firstNextRunUtcFromStart(startDate, frequency)

  const row = await pb.collection('report_schedules').create({
    site: siteId,
    frequency,
    start_at: startIso,
    next_run_at: nextRun.toISOString(),
    is_active: true,
    created_by: userId,
  })

  return { schedule: row }
})
