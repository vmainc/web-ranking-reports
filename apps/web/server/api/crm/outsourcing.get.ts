import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const query = getQuery(event)
  const clientId = (query.clientId as string)?.trim()
  if (!clientId) throw createError({ statusCode: 400, message: 'clientId is required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const clientRecord = await pb.collection('crm_clients').getOne(clientId).catch(() => null)
  if (!clientRecord || (clientRecord as { user?: string }).user !== userId) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const list = await pb.collection('crm_outsourcing').getFullList({
    filter: `client = "${clientId}"`,
    sort: '-order_date',
  })
  return list
})
