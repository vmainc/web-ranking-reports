import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { findProposalByPublicToken } from '~/server/utils/proposals'
import { runProposalAcceptance } from '~/server/utils/proposalAcceptance'

/** Public accept — runs configured CRM side-effects (Phase 4). */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, message: 'Missing token' })

  const body = (await readBody(event).catch(() => ({}))) as {
    name?: string
    email?: string
  }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!name) throw createError({ statusCode: 400, message: 'Name is required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const proposal = await findProposalByPublicToken(pb, token)
  if (!proposal) throw createError({ statusCode: 404, message: 'Proposal not found' })

  // Public accept only for sent/viewed (not draft)
  if (proposal.status === 'draft') {
    throw createError({ statusCode: 400, message: 'Proposal cannot be accepted' })
  }

  const result = await runProposalAcceptance(pb, proposal, {
    acceptedByName: name,
    acceptedByEmail: email || null,
  })

  return {
    ok: result.ok,
    already: result.already,
    effects: result.effects,
    status: result.proposal.status,
  }
})
