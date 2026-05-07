import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { getReportScheduleFieldNames, pickSchedulePatch } from '~/server/utils/reportScheduleTracking'

const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64',
)

export default defineEventHandler(async (event) => {
  const token = String(getQuery(event).token || '').trim()
  if (!token) throw createError({ statusCode: 400, message: 'Missing token' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const fieldNames = await getReportScheduleFieldNames(pb)
  if (fieldNames.has('last_tracking_token')) {
    const esc = token.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const row = await pb
      .collection('report_schedules')
      .getFirstListItem<{ id: string }>(`last_tracking_token = "${esc}"`)
      .catch(() => null)
    if (row) {
      const patch = pickSchedulePatch(fieldNames, { last_email_opened_at: new Date().toISOString() })
      if (Object.keys(patch).length) {
        await pb.collection('report_schedules').update(row.id, patch).catch(() => {})
      }
    }
  }

  setHeader(event, 'Content-Type', 'image/gif')
  setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  return PIXEL_GIF
})

