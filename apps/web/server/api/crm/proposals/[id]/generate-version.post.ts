import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import {
  assertProposalOwned,
  createSupersedingDraft,
  freezeProposalSnapshot,
  listProposalItems,
} from '~/server/utils/proposals'

/**
 * Freeze snapshot + branding on a draft, or create a new draft version from a sent proposal.
 * Body: { mode?: 'freeze' | 'new_version' }
 */
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
  const body = (await readBody(event).catch(() => ({}))) as { mode?: string }
  const mode =
    body.mode === 'new_version' || body.mode === 'freeze'
      ? body.mode
      : ['sent', 'viewed'].includes(status)
        ? 'new_version'
        : 'freeze'

  if (mode === 'new_version') {
    if (!['sent', 'viewed', 'declined', 'draft'].includes(status)) {
      throw createError({ statusCode: 400, message: 'Cannot create a new version from this status' })
    }
    if (status === 'draft') {
      const proposal = await freezeProposalSnapshot(
        pb,
        existing as { id: string; client?: unknown; site?: unknown },
        crmOwnerId,
      )
      const items = await listProposalItems(pb, id)
      return { proposal, items, created_new: false }
    }
    const draft = await createSupersedingDraft(pb, crmOwnerId, existing as never)
    const frozen = await freezeProposalSnapshot(
      pb,
      draft as { id: string; client?: unknown; site?: unknown },
      crmOwnerId,
    )
    const items = await listProposalItems(pb, draft.id)
    return { proposal: frozen, items, created_new: true }
  }

  if (status !== 'draft') {
    throw createError({ statusCode: 400, message: 'Only draft proposals can be frozen in place' })
  }
  const proposal = await freezeProposalSnapshot(
    pb,
    existing as { id: string; client?: unknown; site?: unknown },
    crmOwnerId,
  )
  const items = await listProposalItems(pb, id)
  return { proposal, items, created_new: false }
})
