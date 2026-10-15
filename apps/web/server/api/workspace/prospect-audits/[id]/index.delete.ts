import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { deleteProspectAudit } from '~/server/utils/prospectAudit'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const auditId = getRouterParam(event, 'id')
  if (!auditId) throw createError({ statusCode: 400, message: 'Missing audit id.' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const ownerId = await requireCrmOwnerId(pb, userId)
  const audits = await deleteProspectAudit(pb, ownerId, auditId)
  return { audits }
})
