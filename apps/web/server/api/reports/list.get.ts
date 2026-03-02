import { getQuery } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const query = getQuery(event)
  const limit = Math.min(Math.max(parseInt(String(query.limit || '10'), 10) || 10, 1), 100)
  const filter = `site.user = "${userId}"`
  const list = await pb.collection('reports').getList(1, limit, {
    filter,
    sort: '-created',
    expand: 'site',
  })
  return {
    reports: list.items,
    total: list.totalItems,
  }
})
