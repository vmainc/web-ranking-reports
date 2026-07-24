import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { extractPocketBaseRelationId, requireCrmOwnerId } from '~/server/utils/workspace'
import { assertProposalOwned, listProposalItems, logProposalActivity } from '~/server/utils/proposals'

/** Agency decline. */
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
  if (status === 'declined') {
    const items = await listProposalItems(pb, id)
    return { ok: true, already: true, proposal: existing, items }
  }
  if (!['draft', 'sent', 'viewed'].includes(status)) {
    throw createError({ statusCode: 400, message: 'Proposal cannot be declined' })
  }

  const body = (await readBody(event).catch(() => ({}))) as { reason?: string }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

  const proposal = await pb.collection('proposals').update(id, {
    status: 'declined',
    declined_at: new Date().toISOString(),
  })

  const clientId = extractPocketBaseRelationId((existing as { client?: unknown }).client)
  if (clientId) {
    await logProposalActivity(
      pb,
      crmOwnerId,
      clientId,
      'proposal_declined',
      `Proposal declined by agency: ${(existing as { title?: string }).title || id}${reason ? ` — ${reason}` : ''}`,
    )
  }

  const items = await listProposalItems(pb, id)
  return { ok: true, already: false, proposal, items }
})
