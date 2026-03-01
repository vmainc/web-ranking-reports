import { getQuery } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const query = getQuery(event)
  const status = query.status as string | undefined
  const clientId = query.client as string | undefined
  let filter = 'user = "' + userId + '"'
  if (status && ['open', 'won', 'lost'].includes(status)) filter += ' && status = "' + status + '"'
  if (clientId) filter += ' && client = "' + clientId + '"'
  const list = await pb.collection('crm_sales').getFullList({ filter, sort: '-created', expand: 'client' })
  return { sales: list }
})
