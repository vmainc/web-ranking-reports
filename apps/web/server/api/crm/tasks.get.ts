import { getQuery } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const query = getQuery(event)
  const clientId = query.client as string | undefined
  const status = query.status as string | undefined
  let filter = 'user = "' + userId + '"'
  if (clientId && clientId.trim()) filter += ' && client = "' + clientId.trim() + '"'
  if (status && ['open', 'done'].includes(status)) filter += ' && status = "' + status + '"'
  const list = await pb.collection('crm_tasks').getFullList({
    filter,
    sort: 'due_at',
    expand: 'client',
  })
  return { tasks: list }
})
