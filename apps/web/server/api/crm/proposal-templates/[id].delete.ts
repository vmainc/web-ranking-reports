import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { crmRowOwnedByUser, requireCrmOwnerId } from '~/server/utils/workspace'
import { rethrowIfMissingCollection } from '~/server/utils/pbMissingCollection'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'DELETE') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
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

  try {
    await pb.collection('proposal_templates').delete(id)
    return { ok: true }
  } catch (e) {
    rethrowIfMissingCollection(e, 'proposal_templates')
    throw e
  }
})
