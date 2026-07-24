import { getQuery } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const query = getQuery(event)
  const clientId = typeof query.client === 'string' ? query.client : ''
  const saleId = typeof query.sale === 'string' ? query.sale : ''
  const status = typeof query.status === 'string' ? query.status : ''

  let filter = `user = "${crmOwnerId.replace(/"/g, '\\"')}"`
  if (clientId) filter += ` && client = "${clientId.replace(/"/g, '\\"')}"`
  if (saleId) filter += ` && sale = "${saleId.replace(/"/g, '\\"')}"`
  if (
    status &&
    ['draft', 'sent', 'viewed', 'accepted', 'declined', 'superseded', 'expired'].includes(status)
  ) {
    filter += ` && status = "${status}"`
  }

  const proposals = await pb.collection('proposals').getFullList({
    filter,
    sort: '-updated',
    expand: 'client,sale,site',
  })
  return { proposals }
})
