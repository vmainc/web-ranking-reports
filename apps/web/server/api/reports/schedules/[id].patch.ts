import { createError, getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertAutomatedReportSchedulesAllowed } from '~/server/services/subscriptions'
import { assertSiteAccess } from '~/server/utils/workspace'
import { firstNextRunUtcFromStart, parseIsoOrThrow, type ReportScheduleFrequency } from '~/server/utils/reportScheduleTime'

/** PATCH /api/reports/schedules/:id — update active state and/or schedule fields. */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const body = (await readBody(event).catch(() => ({}))) as {
    is_active?: boolean
    reportId?: string
    frequency?: ReportScheduleFrequency
    startAt?: string
    fromEmail?: string
    toEmail?: string
    senderName?: string
    emailSubject?: string
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertAutomatedReportSchedulesAllowed(pb, userId)
  const collection = await pb.collections.getOne('report_schedules').catch(() => null)
  const schema =
    Array.isArray((collection as { schema?: Array<{ name?: string }> } | null)?.schema)
      ? (collection as { schema: Array<{ name?: string }> }).schema
      : Array.isArray((collection as { fields?: Array<{ name?: string }> } | null)?.fields)
        ? (collection as { fields: Array<{ name?: string }> }).fields
        : []
  const fieldNames = new Set(schema.map((f) => String(f.name || '')))

  const existing = await pb.collection('report_schedules').getOne<{ site?: string; report?: string }>(id)
  const siteId = typeof existing.site === 'string' ? existing.site : ''
  if (!siteId) throw createError({ statusCode: 404, message: 'Schedule not found' })

  await assertSiteAccess(pb, siteId, userId, true)

  const patch: Record<string, unknown> = {}

  if (typeof body.is_active === 'boolean') {
    patch.is_active = body.is_active
  }
  if (typeof body.fromEmail === 'string') {
    const fromEmail = body.fromEmail.trim()
    if (fromEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
      throw createError({ statusCode: 400, message: 'Enter a valid "from" email.' })
    }
    patch.from_email = fromEmail || null
  }
  if (typeof body.toEmail === 'string') {
    const toEmail = body.toEmail.trim()
    if (toEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      throw createError({ statusCode: 400, message: 'Enter a valid "to" email.' })
    }
    patch.to_email = toEmail || null
  }
  if (typeof body.senderName === 'string') {
    const senderName = body.senderName.trim()
    if (senderName.length > 120) {
      throw createError({ statusCode: 400, message: 'Sender name must be 120 characters or less.' })
    }
    if (fieldNames.has('sender_name')) patch.sender_name = senderName || null
  }
  if (typeof body.emailSubject === 'string') {
    const emailSubject = body.emailSubject.trim()
    if (emailSubject.length > 200) {
      throw createError({ statusCode: 400, message: 'Subject must be 200 characters or less.' })
    }
    if (fieldNames.has('email_subject')) patch.email_subject = emailSubject || null
  }

  let effectiveSiteId = siteId
  if (typeof body.reportId === 'string') {
    const reportId = body.reportId.trim()
    if (!reportId) throw createError({ statusCode: 400, message: 'reportId cannot be empty.' })
    const report = await pb.collection('reports').getOne<{ site?: string }>(reportId).catch(() => null)
    const reportSiteId = report && typeof report.site === 'string' ? report.site : ''
    if (!reportSiteId) throw createError({ statusCode: 404, message: 'Report not found' })
    await assertSiteAccess(pb, reportSiteId, userId, true)
    effectiveSiteId = reportSiteId
    patch.report = reportId
    patch.site = reportSiteId
  }

  const frequency = body.frequency
  if (typeof frequency === 'string') {
    if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
      throw createError({ statusCode: 400, message: 'frequency must be daily, weekly, or monthly' })
    }
    patch.frequency = frequency
  }
  if (typeof body.startAt === 'string') {
    const startAt = body.startAt.trim()
    if (!startAt) throw createError({ statusCode: 400, message: 'startAt cannot be empty.' })
    const startDate = parseIsoOrThrow(startAt)
    patch.start_at = startDate.toISOString()
  }

  const recalcNextRun = typeof patch.start_at === 'string' || typeof patch.frequency === 'string'
  if (recalcNextRun) {
    const startAtIso = (patch.start_at as string | undefined) || (existing as { start_at?: string }).start_at || ''
    const freq = (patch.frequency as ReportScheduleFrequency | undefined) || (existing as { frequency?: ReportScheduleFrequency }).frequency
    if (!startAtIso || !freq) {
      throw createError({ statusCode: 400, message: 'Could not recalculate next run (missing start/frequency).' })
    }
    const startDate = parseIsoOrThrow(startAtIso)
    patch.next_run_at = firstNextRunUtcFromStart(startDate, freq).toISOString()
  }

  if (Object.keys(patch).length === 0) {
    throw createError({ statusCode: 400, message: 'No valid fields to update.' })
  }

  await assertSiteAccess(pb, effectiveSiteId, userId, true)
  const updated = await pb.collection('report_schedules').update(id, patch)
  return { schedule: updated }
})
