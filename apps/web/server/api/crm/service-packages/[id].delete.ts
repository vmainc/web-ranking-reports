import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { crmRowOwnedByUser, requireCrmOwnerId } from '~/server/utils/workspace'
import { rethrowIfMissingCollection } from '~/server/utils/pbMissingCollection'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const id = String(event.context.params?.id || '')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const existing = await pb.collection('proposal_service_packages').getOne(id).catch(() => null)
  if (!existing || !crmRowOwnedByUser(existing as { user?: unknown }, crmOwnerId)) {
    throw createError({ statusCode: 404, message: 'Package not found' })
  }

  try {
    await pb.collection('proposal_service_packages').delete(id)
    return { ok: true }
  } catch (e: unknown) {
    rethrowIfMissingCollection(e, 'proposal_service_packages')
  }
})