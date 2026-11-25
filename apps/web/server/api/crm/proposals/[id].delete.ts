import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import type { ProposalStatus } from '~/types'
import { assertProposalOwned, DELETABLE_PROPOSAL_STATUSES, listProposalItems } from '~/server/utils/proposals'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'DELETE') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const existing = await assertProposalOwned(pb, id, crmOwnerId)
  const status = String((existing as { status?: string }).status || '')
  if (!DELETABLE_PROPOSAL_STATUSES.includes(status as ProposalStatus)) {
    throw createError({
      statusCode: 400,
      message: 'Accepted proposals cannot be deleted from CRM.',
    })
  }

  const items = await listProposalItems(pb, id)
  for (const item of items) {
    await pb.collection('proposal_items').delete(item.id).catch(() => {})
  }
  await pb.collection('proposals').delete(id)
  return { ok: true }
})