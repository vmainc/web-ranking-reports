import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { findFacebookPageConnection } from '~/server/services/social/socialConnections'
import {
  listSocialPostsForConnection,
  publicSocialPost,
  sortSocialPosts,
} from '~/server/services/social/socialPosts'

function dateParam(v: unknown, fallback: string): string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return fallback
  return v
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const query = getQuery(event)
  const end = dateParam(query.end, new Date().toISOString().slice(0, 10))
  const startDefault = new Date(`${end}T00:00:00Z`)
  startDefault.setUTCDate(startDefault.getUTCDate() - 27)
  const start = dateParam(query.start, startDefault.toISOString().slice(0, 10))
  const sort = query.sort === 'reach' ? 'reach' : 'published'
  const limitRaw = typeof query.limit === 'string' ? Number(query.limit) : 50
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200) : 50

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteAccess(pb, siteId, userId, false)

  const connection = await findFacebookPageConnection(pb, siteId)
  if (!connection || connection.access_type !== 'authenticated') {
    return { posts: [], connectionId: connection?.id || null }
  }

  try {
    const rows = await listSocialPostsForConnection(pb, connection.id, { since: start, until: end })
    return {
      connectionId: connection.id,
      posts: sortSocialPosts(rows, sort).slice(0, limit).map(publicSocialPost),
    }
  } catch {
    return { posts: [], connectionId: connection.id }
  }
})
