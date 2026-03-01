import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Client id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const record = await pb.collection('crm_clients').getOne(id)
  if ((record as { user?: string }).user !== userId) throw createError({ statusCode: 403, message: 'Forbidden' })
  return record
})
