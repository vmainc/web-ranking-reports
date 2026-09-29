import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireWorkspaceOwner, getWorkspaceContext } from '~/server/utils/workspace'
import { mapMetaAdAccountToSite, publicSocialConnection } from '~/server/services/social/mapMetaAdAccount'
import { throwHttpFromSocial } from '~/server/services/social/errors'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = await readBody<{ accountId?: string; siteId?: string }>(event)
  const accountId = String(body?.accountId || '').trim()
  const siteId = String(body?.siteId || '').trim()
  if (!accountId || !siteId) {
    throw createError({ statusCode: 400, message: 'accountId and siteId are required' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  await requireWorkspaceOwner(pb, userId)
  const ctx = await getWorkspaceContext(pb, userId)

  try {
    const { connection } = await mapMetaAdAccountToSite(pb, {
      agencyOwnerId: ctx.ownerId,
      siteId,
      accountId,
    })
    return { connection: publicSocialConnection(connection) }
  } catch (e) {
    throwHttpFromSocial(e)
  }
})
