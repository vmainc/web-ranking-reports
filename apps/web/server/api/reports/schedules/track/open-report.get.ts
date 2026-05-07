import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { getReportScheduleFieldNames, pickSchedulePatch } from '~/server/utils/reportScheduleTracking'

export default defineEventHandler(async (event) => {
  const token = String(getQuery(event).token || '').trim()
  if (!token) throw createError({ statusCode: 400, message: 'Missing token' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const fieldNames = await getReportScheduleFieldNames(pb)
  const hasTokenField = fieldNames.has('last_tracking_token')
  if (!hasTokenField) {
    return sendRedirect(event, '/reports', 302)
  }

  const esc = token.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const row = await pb
    .collection('report_schedules')
    .getFirstListItem<{ id: string; last_delivery_report_id?: string }>(`last_tracking_token = "${esc}"`)
    .catch(() => null)
  if (!row) return sendRedirect(event, '/reports', 302)

  const patch = pickSchedulePatch(fieldNames, { last_report_opened_at: new Date().toISOString() })
  if (Object.keys(patch).length) {
    await pb.collection('report_schedules').update(row.id, patch).catch(() => {})
  }
  const reportId = typeof row.last_delivery_report_id === 'string' ? row.last_delivery_report_id.trim() : ''
  if (reportId) return sendRedirect(event, `/reports/${reportId}/preview`, 302)
  return sendRedirect(event, '/reports', 302)
})

