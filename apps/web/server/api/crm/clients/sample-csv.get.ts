import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

/** Download a sample CSV for importing CRM clients. */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  // Auth just to ensure only signed-in users can see the sample (no PB access needed here).
  const pb = getAdminPb()
  await adminAuth(pb)

  const headers = [
    'name',
    'email',
    'phone',
    'company',
    'status',
    'source',
    'next_step',
    'notes',
    'tags',
  ]
  const csv = `${headers.join(',')}\n`

  setResponseHeaders(event, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename=\"crm-clients-sample.csv\"',
  })
  return csv
})

