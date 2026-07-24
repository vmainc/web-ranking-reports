import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { proposalItemsReplaceSchema } from '~/lib/proposalSchemas'
import {
  assertProposalOwned,
  EDITABLE_PROPOSAL_STATUSES,
  listProposalItems,
  replaceProposalItems,
} from '~/server/utils/proposals'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const existing = await assertProposalOwned(pb, id, crmOwnerId)
  const status = String((existing as { status?: string }).status || '')
  if (!EDITABLE_PROPOSAL_STATUSES.includes(status as 'draft')) {
    throw createError({ statusCode: 400, message: 'Only draft proposals can change items' })
  }

  const raw = await readBody(event).catch(() => ({}))
  const parsed = proposalItemsReplaceSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid items' })
  }

  await replaceProposalItems(pb, crmOwnerId, id, parsed.data.items)
  const proposal = await pb.collection('proposals').getOne(id, { expand: 'client,sale,site' })
  const items = await listProposalItems(pb, id)
  return { proposal, items }
})
