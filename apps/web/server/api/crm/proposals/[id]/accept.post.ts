import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { assertProposalOwned, listProposalItems } from '~/server/utils/proposals'
import { runProposalAcceptance } from '~/server/utils/proposalAcceptance'
import type { Proposal, ProposalAcceptanceOptions } from '~/types'

/** Agency accept on behalf of client — runs acceptance side-effects. */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const existing = (await assertProposalOwned(pb, id, crmOwnerId)) as Proposal
  const body = (await readBody(event).catch(() => ({}))) as {
    name?: string
    email?: string
    options?: ProposalAcceptanceOptions
    skip_expiry_check?: boolean
  }
  const name =
    (typeof body.name === 'string' && body.name.trim()) ||
    'Agency (on behalf of client)'

  const result = await runProposalAcceptance(pb, existing, {
    acceptedByName: name,
    acceptedByEmail: typeof body.email === 'string' ? body.email.trim() : null,
    optionsOverride: body.options || null,
    skipExpiryCheck: body.skip_expiry_check === true,
  })

  const items = await listProposalItems(pb, id)
  return {
    ok: result.ok,
    already: result.already,
    effects: result.effects,
    proposal: result.proposal,
    items,
  }
})
