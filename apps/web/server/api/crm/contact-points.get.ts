import { getQuery } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const query = getQuery(event)
  const clientId = query.client as string | undefined
  const kind = query.kind as string | undefined
  let filter = 'user = "' + userId + '"'
  if (clientId) filter += ' && client = "' + clientId + '"'
  if (kind && ['call', 'email', 'meeting', 'note'].includes(kind)) filter += ' && kind = "' + kind + '"'
  const list = await pb.collection('crm_contact_points').getFullList({ filter, sort: '-happened_at', expand: 'client' })
  return { contactPoints: list }
})
