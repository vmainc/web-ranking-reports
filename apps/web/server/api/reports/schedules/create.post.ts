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
    reportId?: string
    siteId?: string
    frequency?: string
    startAt?: string
    fromEmail?: string
    toEmail?: string
  }
  const reportId = typeof body.reportId === 'string' ? body.reportId.trim() : ''
  const siteId = typeof body.siteId === 'string' ? body.siteId.trim() : ''
  const frequency = body.frequency as ReportScheduleFrequency
  const startAtRaw = typeof body.startAt === 'string' ? body.startAt.trim() : ''
  const fromEmail = typeof body.fromEmail === 'string' ? body.fromEmail.trim() : ''
  const toEmail = typeof body.toEmail === 'string' ? body.toEmail.trim() : ''

  if (!reportId && !siteId) throw createError({ statusCode: 400, message: 'reportId required' })
  if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
    throw createError({ statusCode: 400, message: 'frequency must be daily, weekly, or monthly' })
  }
  if (!startAtRaw) throw createError({ statusCode: 400, message: 'startAt (ISO date/time) required' })
  if (toEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    throw createError({ statusCode: 400, message: 'Enter a valid "to" email.' })
  }
  if (fromEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
    throw createError({ statusCode: 400, message: 'Enter a valid "from" email.' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  let resolvedSiteId = siteId
  if (reportId) {
    const report = await pb.collection('reports').getOne<{ site?: string }>(reportId).catch(() => null)
    const sid = report && typeof report.site === 'string' ? report.site : ''
    if (!sid) throw createError({ statusCode: 404, message: 'Report not found' })
    resolvedSiteId = sid
  }
  await assertSiteAccess(pb, resolvedSiteId, userId, true)

  const startDate = parseIsoOrThrow(startAtRaw)
  const startIso = startDate.toISOString()
  const nextRun = firstNextRunUtcFromStart(startDate, frequency)

  const collection = await pb.collections.getOne('report_schedules').catch(() => null)
  if (!collection) {
    throw createError({
      statusCode: 503,
      message:
        'Report schedules collection not found on PocketBase. On the server run: ./infra/run-report-schedules-migrations.sh (see docs/DEPLOY_LIVE.md).',
    })
  }
  const fieldNames = new Set(
    Array.isArray((collection as { fields?: Array<{ name?: string }> } | null)?.fields)
      ? ((collection as { fields: Array<{ name?: string }> }).fields.map((f) => String(f.name || '')))
      : [],
  )

  const row = await pb.collection('report_schedules').create({
    site: resolvedSiteId,
    ...(fieldNames.has('report') ? { report: reportId || null } : {}),
    ...(fieldNames.has('report_id') ? { report_id: reportId || '' } : {}),
    frequency,
    start_at: startIso,
    ...(fieldNames.has('from_email') ? { from_email: fromEmail || null } : {}),
    ...(fieldNames.has('to_email') ? { to_email: toEmail || null } : {}),
    next_run_at: nextRun.toISOString(),
    is_active: true,
    created_by: userId,
  })

  return { schedule: row }
})
