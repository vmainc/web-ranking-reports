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

  let record: { site: string }
  try {
    record = await pb.collection('rank_keywords').getOne(keywordId) as { site: string }
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string }
    if (err?.status === 404 || (err?.message && /requested resource wasn't found|collection.*not found/i.test(err.message))) {
      throw createError({
        statusCode: 503,
        message: 'Rank tracking is not set up. Create the PocketBase collection by running: node scripts/create-collections.mjs from the apps/web directory (with PocketBase running and POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD set).',
      })
    }
    throw e
  }
  if (record.site !== siteId) {
    throw createError({ statusCode: 404, message: 'Keyword not found' })
  }

  await pb.collection('rank_keywords').delete(keywordId)
  return { ok: true }
})
