import { getQuery } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { pocketbaseFilterReportSchedulesForUser } from '~/server/utils/reportSchedulesAccess'

/** GET /api/reports/schedules/list — automated report schedules for the current user. */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)

  const query = getQuery(event)
  const siteId = typeof query.siteId === 'string' ? query.siteId.trim() : ''

  let filter = await pocketbaseFilterReportSchedulesForUser(pb, userId)
  if (siteId) {
    const esc = siteId.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    filter = `(${filter}) && site = "${esc}"`
  }

  const list = await pb.collection('report_schedules').getList(1, 100, {
    filter,
    sort: 'next_run_at',
    expand: 'site',
  })

  return { schedules: list.items, total: list.totalItems }
})
