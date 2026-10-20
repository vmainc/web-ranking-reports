import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { crmRowOwnedByUser, requireCrmOwnerId } from '~/server/utils/workspace'
import { proposalTemplatePatchSchema } from '~/lib/proposalSchemas'
import { normalizeProposalContent } from '~/utils/proposalContent'
import { rethrowIfMissingCollection } from '~/server/utils/pbMissingCollection'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const existing = await pb.collection('proposal_templates').getOne(id).catch(() => null)
  if (!existing || !crmRowOwnedByUser(existing as { user?: unknown }, crmOwnerId)) {
    throw createError({ statusCode: 404, message: 'Template not found' })
  }

  const raw = await readBody(event).catch(() => ({}))
  const parsed = proposalTemplatePatchSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid patch' })
  }
  const body = parsed.data
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.description !== undefined) updates.description = body.description
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order
  if (body.content_json !== undefined) updates.content_json = normalizeProposalContent(body.content_json)
  if (body.is_default !== undefined) {
    updates.is_default = body.is_default
    if (body.is_default) {
      const esc = crmOwnerId.replace(/"/g, '\\"')
      const rows = await pb.collection('proposal_templates').getFullList({ filter: `user = "${esc}"` })
      for (const row of rows) {
        if ((row as { id: string }).id !== id) {
          await pb.collection('proposal_templates').update((row as { id: string }).id, { is_default: false })
        }
      }
    }
  }
  if (!Object.keys(updates).length) {
    throw createError({ statusCode: 400, message: 'No valid updates' })
  }

  try {
    const template = await pb.collection('proposal_templates').update(id, updates)
    return { template }
  } catch (e) {
    rethrowIfMissingCollection(e, 'proposal_templates')
    throw e
  }
})
