import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireWorkspaceOwner, getWorkspaceContext } from '~/server/utils/workspace'
import { mapMetaPageToSite } from '~/server/services/social/mapMetaPage'
import { publicSocialConnection } from '~/server/services/social/socialConnections'
import { throwHttpFromSocial } from '~/server/services/social/errors'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = await readBody<{ pageId?: string; siteId?: string }>(event)
  const pageId = typeof body?.pageId === 'string' ? body.pageId.trim() : ''
  const siteId = typeof body?.siteId === 'string' ? body.siteId.trim() : ''
  if (!pageId || !siteId) {
    throw createError({ statusCode: 400, message: 'pageId and siteId are required' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  await requireWorkspaceOwner(pb, userId)
  const ctx = await getWorkspaceContext(pb, userId)

  try {
    const { connection, upgraded } = await mapMetaPageToSite(pb, {
      agencyOwnerId: ctx.ownerId,
      siteId,
      pageId,
    })
    return { connection: publicSocialConnection(connection), upgraded }
  } catch (e) {
    throwHttpFromSocial(e)
  }
})
