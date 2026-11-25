import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { listServicePackages, seedVmaServicePackages } from '~/server/utils/proposalServicePackages'
import { rethrowIfMissingCollection } from '~/server/utils/pbMissingCollection'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)

  try {
    const stats = await seedVmaServicePackages(pb, crmOwnerId)
    const packages = await listServicePackages(pb, crmOwnerId)
    return { ok: true, ...stats, packages }
  } catch (e: unknown) {
    rethrowIfMissingCollection(e, 'proposal_service_packages')
  }
})