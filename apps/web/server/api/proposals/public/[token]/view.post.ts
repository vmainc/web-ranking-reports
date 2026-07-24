import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { extractPocketBaseRelationId } from '~/server/utils/workspace'
import {
  findProposalByPublicToken,
  logProposalActivity,
  PUBLIC_VIEWABLE_STATUSES,
} from '~/server/utils/proposals'
import type { ProposalStatus } from '~/types'

/** Idempotent first-view tracker. */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, message: 'Missing token' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const proposal = await findProposalByPublicToken(pb, token)
  if (!proposal) throw createError({ statusCode: 404, message: 'Proposal not found' })

  const status = proposal.status as ProposalStatus
  if (!PUBLIC_VIEWABLE_STATUSES.includes(status)) {
    throw createError({ statusCode: 404, message: 'Proposal not found' })
  }

  if (status === 'sent' && !proposal.viewed_at) {
    await pb.collection('proposals').update(proposal.id, {
      status: 'viewed',
      viewed_at: new Date().toISOString(),
    })
    const clientId = extractPocketBaseRelationId(proposal.client)
    const ownerId = extractPocketBaseRelationId(proposal.user)
    if (clientId && ownerId) {
      await logProposalActivity(pb, ownerId, clientId, 'proposal_viewed', `Proposal viewed: ${proposal.title}`)
    }
    return { ok: true, first_view: true }
  }

  return { ok: true, first_view: false }
})
