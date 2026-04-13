import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const q = getQuery(event)
  const pendingOnly = q.pending === '1' || q.pending === 'true'

  const pb = getAdminPb()
  await adminAuth(pb)

  const filter = `user = "${userId}"`

  const list = await pb.collection('seoptimer_leads').getFullList({
    filter,
    sort: '-received_at',
    batch: 200,
    expand: 'crm_client',
  })

  const leads = pendingOnly ? list.filter((row: { crm_client?: string | null }) => !row.crm_client) : list

  return { leads }
})
