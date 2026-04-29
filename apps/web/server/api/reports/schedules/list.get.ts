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

  const collection = await pb.collections.getOne('report_schedules').catch(() => null)
  const schema =
    collection &&
    Array.isArray((collection as { schema?: Array<{ name?: string }> }).schema)
      ? (collection as { schema: Array<{ name?: string }> }).schema
      : collection && Array.isArray((collection as { fields?: Array<{ name?: string }> }).fields)
        ? (collection as { fields: Array<{ name?: string }> }).fields
        : []
  const fieldNames = new Set(schema.map((f) => String(f.name || '')))
  const expand = fieldNames.has('report') ? 'site,report' : 'site'
  let list: { items: unknown[]; totalItems: number }
  try {
    list = await pb.collection('report_schedules').getList(1, 100, {
      filter,
      sort: 'next_run_at',
      expand,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/requested resource wasn't found|collection.*not found/i.test(msg)) {
      throw createError({
        statusCode: 503,
        message:
          'Report schedules collection not found on PocketBase. On the server run: ./infra/run-report-schedules-migrations.sh (see docs/DEPLOY_LIVE.md).',
      })
    }
    throw e
  }

  return { schedules: list.items, total: list.totalItems }
})
