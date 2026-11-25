import { getQuery } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { listServicePackages } from '~/server/utils/proposalServicePackages'
import { rethrowIfMissingCollection } from '~/server/utils/pbMissingCollection'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const query = getQuery(event)
  const activeOnly = query.active === '1' || query.active === 'true'

  try {
    const packages = await listServicePackages(pb, crmOwnerId, { activeOnly })
    return { packages }
  } catch (e: unknown) {
    rethrowIfMissingCollection(e, 'proposal_service_packages')
  }
})