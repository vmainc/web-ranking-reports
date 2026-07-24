import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { extractPocketBaseRelationId, requireCrmOwnerId } from '~/server/utils/workspace'
import { proposalPatchSchema } from '~/lib/proposalSchemas'
import { assertProposalOwned, EDITABLE_PROPOSAL_STATUSES } from '~/server/utils/proposals'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const existing = await assertProposalOwned(pb, id, crmOwnerId)
  const status = String((existing as { status?: string }).status || '')
  const isDraft = EDITABLE_PROPOSAL_STATUSES.includes(status as 'draft')
  const canEditOptions = ['draft', 'sent', 'viewed'].includes(status)

  const raw = await readBody(event).catch(() => ({}))
  const parsed = proposalPatchSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid patch' })
  }
  const body = parsed.data
  const updates: Record<string, unknown> = {}

  const contentKeys = ['title', 'intro_html', 'terms_html', 'currency', 'valid_until', 'site'] as const
  const wantsContentEdit = contentKeys.some((k) => body[k] !== undefined)
  if (wantsContentEdit && !isDraft) {
    throw createError({ statusCode: 400, message: 'Only draft proposals can edit content' })
  }
  if (!isDraft && !canEditOptions) {
    throw createError({ statusCode: 400, message: 'Proposal cannot be edited' })
  }
  if (!isDraft && body.acceptance_options_json === undefined) {
    throw createError({ statusCode: 400, message: 'Only acceptance options can be updated after send' })
  }

  if (isDraft) {
    if (body.title !== undefined) updates.title = body.title
    if (body.intro_html !== undefined) updates.intro_html = body.intro_html
    if (body.terms_html !== undefined) updates.terms_html = body.terms_html
    if (body.currency !== undefined) updates.currency = body.currency.toUpperCase()
    if (body.valid_until !== undefined) updates.valid_until = body.valid_until
    if (body.site !== undefined) {
      if (body.site) {
        const site = await pb.collection('sites').getOne(body.site).catch(() => null)
        const siteUser = site ? extractPocketBaseRelationId((site as { user?: unknown }).user) : ''
        if (!site || siteUser !== crmOwnerId) {
          throw createError({ statusCode: 403, message: 'Site not found' })
        }
        updates.site = body.site
      } else {
        updates.site = null
      }
    }
  }

  if (body.acceptance_options_json !== undefined && canEditOptions) {
    updates.acceptance_options_json = body.acceptance_options_json
  }

  if (!Object.keys(updates).length) {
    throw createError({ statusCode: 400, message: 'No valid updates' })
  }

  const proposal = await pb.collection('proposals').update(id, updates)
  return { proposal }
})
