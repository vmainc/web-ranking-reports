import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'DELETE') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  const keywordId = getRouterParam(event, 'keywordId')
  if (!siteId || !keywordId) throw createError({ statusCode: 400, message: 'Site id and keyword id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const record = await pb.collection('rank_keywords').getOne(keywordId)
  if ((record as { site: string }).site !== siteId) {
    throw createError({ statusCode: 404, message: 'Keyword not found' })
  }

  await pb.collection('rank_keywords').delete(keywordId)
  return { ok: true }
})
