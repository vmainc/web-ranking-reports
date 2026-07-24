import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { extractPocketBaseRelationId, requireCrmOwnerId } from '~/server/utils/workspace'
import {
  assertProposalOwned,
  freezeProposalSnapshot,
  logProposalActivity,
  newPublicToken,
} from '~/server/utils/proposals'

/** Mark draft as sent, freeze snapshot if needed, ensure public share token. */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  let existing = await assertProposalOwned(pb, id, crmOwnerId)
  const status = String((existing as { status?: string }).status || '')
  if (!['draft', 'sent', 'viewed'].includes(status)) {
    throw createError({ statusCode: 400, message: 'Proposal cannot be sent in its current status' })
  }

  if (status === 'draft') {
    const hasSnapshot = !!(existing as { snapshot_json?: unknown }).snapshot_json
    if (!hasSnapshot) {
      existing = await freezeProposalSnapshot(
        pb,
        existing as { id: string; client?: unknown; site?: unknown },
        crmOwnerId,
      )
    }
  }

  const token =
    typeof (existing as { public_token?: string }).public_token === 'string' &&
    (existing as { public_token?: string }).public_token
      ? (existing as { public_token: string }).public_token
      : newPublicToken()

  const proposal = await pb.collection('proposals').update(id, {
    status: status === 'draft' ? 'sent' : status,
    public_token: token,
    sent_at: (existing as { sent_at?: string }).sent_at || new Date().toISOString(),
  })

  const clientId = extractPocketBaseRelationId((existing as { client?: unknown }).client)
  if (clientId && status === 'draft') {
    await logProposalActivity(
      pb,
      crmOwnerId,
      clientId,
      'proposal_sent',
      `Proposal sent: ${(existing as { title?: string }).title || id}`,
    )
    // Move pipeline to proposal stage when still a lead
    try {
      const client = await pb.collection('crm_clients').getOne(clientId)
      if ((client as { status?: string }).status === 'lead') {
        const stage = (client as { pipeline_stage?: string }).pipeline_stage
        if (stage && !['proposal', 'won', 'lost'].includes(stage)) {
          await pb.collection('crm_clients').update(clientId, { pipeline_stage: 'proposal' })
        }
      }
    } catch {
      //
    }
  }

  const config = useRuntimeConfig()
  const appUrl = String(config.public?.appUrl || config.appUrl || 'http://localhost:3000').replace(/\/+$/, '')
  const public_url = `${appUrl}/p/${token}`

  return { proposal, public_token: token, public_url }
})
