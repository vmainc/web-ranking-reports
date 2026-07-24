import { getQuery } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { rethrowIfMissingCollection } from '~/server/utils/pbMissingCollection'

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

  let proposals
  try {
    proposals = await pb.collection('proposals').getFullList({
      filter,
      sort: '-updated',
      expand: 'client,sale,site',
    })
  } catch (e: unknown) {
    rethrowIfMissingCollection(e, 'proposals')
  }
  return { proposals }
})
