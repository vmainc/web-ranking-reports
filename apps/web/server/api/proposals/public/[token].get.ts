import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import {
  findProposalByPublicToken,
  listProposalItems,
  PUBLIC_VIEWABLE_STATUSES,
  toPublicProposalDto,
} from '~/server/utils/proposals'
import type { ProposalStatus } from '~/types'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, message: 'Missing token' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const proposal = await findProposalByPublicToken(pb, token)
  if (!proposal) throw createError({ statusCode: 404, message: 'Proposal not found' })

  const status = proposal.status as ProposalStatus
  // Token is a capability URL — allow draft for agency PDF/preview via same token.
  if (status === 'superseded' || status === 'expired') {
    throw createError({ statusCode: 404, message: 'Proposal not found' })
  }
  if (!PUBLIC_VIEWABLE_STATUSES.includes(status) && status !== 'draft') {
    throw createError({ statusCode: 404, message: 'Proposal not found' })
  }
  if (proposal.valid_until && status !== 'accepted' && status !== 'draft') {
    const until = new Date(proposal.valid_until).getTime()
    if (Number.isFinite(until) && until < Date.now()) {
      throw createError({ statusCode: 410, message: 'This proposal has expired' })
    }
  }

  const items = await listProposalItems(pb, proposal.id)
  return { proposal: toPublicProposalDto(proposal, items) }
})
