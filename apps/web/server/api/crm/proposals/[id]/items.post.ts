import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { formatPocketBaseError, isPocketBaseMissingCollection } from '~/server/utils/pocketBaseError'
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
  try {
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
      const detail = parsed.error.issues.map((i) => `${i.path.join('.') || 'items'}: ${i.message}`).join('; ')
      throw createError({ statusCode: 400, message: detail || 'Invalid items' })
    }

    const items = parsed.data.items.map((row) => ({
      ...row,
      qty: row.qty == null || row.qty < 1 ? 1 : row.qty,
    }))

    try {
      await replaceProposalItems(pb, crmOwnerId, id, items)
    } catch (e: unknown) {
      const pbMsg = formatPocketBaseError(e)
      const statusCode = isPocketBaseMissingCollection(e) ? 503 : 400
      throw createError({
        statusCode: statusCode,
        message:
          statusCode === 503
            ? 'Proposal collections are not set up on the server. Run ./infra/run-proposal-collections.sh on the VPS.'
            : `Could not save line items: ${pbMsg}`,
      })
    }

    const proposal = await pb.collection('proposals').getOne(id, { expand: 'client,sale,site' })
    const savedItems = await listProposalItems(pb, id)
    return { proposal, items: savedItems }
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'statusCode' in e) throw e
    const pbMsg = formatPocketBaseError(e)
    throw createError({
      statusCode: isPocketBaseMissingCollection(e) ? 503 : 500,
      message: `Could not save line items: ${pbMsg}`,
    })
  }
})
