import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { extractPocketBaseRelationId } from '~/server/utils/workspace'
import {
  findProposalByPublicToken,
  logProposalActivity,
} from '~/server/utils/proposals'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, message: 'Missing token' })

  const body = (await readBody(event).catch(() => ({}))) as { reason?: string }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

  const pb = getAdminPb()
  await adminAuth(pb)
  const proposal = await findProposalByPublicToken(pb, token)
  if (!proposal) throw createError({ statusCode: 404, message: 'Proposal not found' })

  if (proposal.status === 'declined') return { ok: true, already: true }
  if (!['sent', 'viewed'].includes(proposal.status)) {
    throw createError({ statusCode: 400, message: 'Proposal cannot be declined' })
  }

  await pb.collection('proposals').update(proposal.id, {
    status: 'declined',
    declined_at: new Date().toISOString(),
  })

  const clientId = extractPocketBaseRelationId(proposal.client)
  const ownerId = extractPocketBaseRelationId(proposal.user)
  if (clientId && ownerId) {
    await logProposalActivity(
      pb,
      ownerId,
      clientId,
      'proposal_declined',
      `Proposal declined: ${proposal.title}${reason ? ` — ${reason}` : ''}`,
    )
  }

  return { ok: true, already: false }
})
