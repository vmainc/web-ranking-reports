import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { resolveAndCreatePublicFacebookConnection } from '~/server/services/social/publicFacebookTracking'
import { throwHttpFromSocial } from '~/server/services/social/errors'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const body = await readBody<{ url?: string }>(event)
  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  if (!url) throw createError({ statusCode: 400, message: 'Facebook Page URL is required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteAccess(pb, siteId, userId, true)

  try {
    return await resolveAndCreatePublicFacebookConnection(pb, { siteId, url })
  } catch (e) {
    throwHttpFromSocial(e)
  }
})
