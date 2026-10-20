import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { rethrowIfMissingCollection } from '~/server/utils/pbMissingCollection'
import type { ProposalTemplate } from '~/types'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const esc = crmOwnerId.replace(/"/g, '\\"')
  try {
    const templates = await pb.collection('proposal_templates').getFullList<ProposalTemplate>({
      filter: `user = "${esc}"`,
      sort: 'sort_order,name',
    })
    return { templates }
  } catch (e) {
    rethrowIfMissingCollection(e, 'proposal_templates')
    throw e
  }
})
