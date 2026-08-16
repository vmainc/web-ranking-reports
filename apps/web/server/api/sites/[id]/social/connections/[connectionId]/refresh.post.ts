import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { getSocialConnection, publicSocialConnection } from '~/server/services/social/socialConnections'
import { syncFacebookConnection } from '~/server/services/social/syncFacebook'
import { throwHttpFromSocial, SocialErrorCode, SocialServiceError } from '~/server/services/social/errors'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  const connectionId = getRouterParam(event, 'connectionId')
  if (!siteId || !connectionId) throw createError({ statusCode: 400, message: 'Site and connection id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteAccess(pb, siteId, userId, true)

  try {
    const row = await getSocialConnection(pb, connectionId)
    if (row.site !== siteId) {
      throw new SocialServiceError({
        code: SocialErrorCode.SOCIAL_CONNECTION_NOT_FOUND,
        message: 'Connection does not belong to this site',
        httpStatus: 404,
      })
    }
    const result = await syncFacebookConnection(pb, row)
    const refreshed = await getSocialConnection(pb, connectionId)
    return { ...result, connection: publicSocialConnection(refreshed) }
  } catch (e) {
    throwHttpFromSocial(e)
  }
})
