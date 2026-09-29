import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireWorkspaceOwner, getWorkspaceContext } from '~/server/utils/workspace'
import { unmapMetaAdAccount } from '~/server/services/social/mapMetaAdAccount'
import { throwHttpFromSocial } from '~/server/services/social/errors'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const connectionId = getRouterParam(event, 'connectionId')
  if (!connectionId) throw createError({ statusCode: 400, message: 'connectionId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await requireWorkspaceOwner(pb, userId)
  const ctx = await getWorkspaceContext(pb, userId)

  try {
    return await unmapMetaAdAccount(pb, { agencyOwnerId: ctx.ownerId, connectionId })
  } catch (e) {
    throwHttpFromSocial(e)
  }
})
