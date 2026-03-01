import { getQuery } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const query = getQuery(event)
  const status = query.status as string | undefined
  const search = query.search as string | undefined
  let filter = 'user = "' + userId + '"'
  if (status && ['lead', 'client', 'archived'].includes(status)) filter += ' && status = "' + status + '"'
  if (search && String(search).trim()) {
    const term = String(search).trim().replace(/"/g, '\\"')
    filter += ' && (name ~ "' + term + '" || email ~ "' + term + '" || company ~ "' + term + '")'
  }
  const list = await pb.collection('crm_clients').getFullList({ filter, sort: '-created' })
  return { clients: list }
})
