import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { assertProposalOwned, listProposalItems } from '~/server/utils/proposals'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  await assertProposalOwned(pb, id, crmOwnerId)
  const proposal = await pb.collection('proposals').getOne(id, { expand: 'client,sale,site' })
  const items = await listProposalItems(pb, id)
  return { proposal, items }
})
