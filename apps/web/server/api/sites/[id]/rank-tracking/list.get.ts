import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

const MAX_KEYWORDS = 100

export interface RankKeywordRecord {
  id: string
  site: string
  keyword: string
  last_result_json?: {
    position?: number
    rankAbsolute?: number
    url?: string
    title?: string
    description?: string
    domain?: string
    fetchedAt?: string
    error?: string
  } | null
  created: string
  updated: string
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  let list: RankKeywordRecord[]
  try {
    list = await pb.collection('rank_keywords').getFullList<RankKeywordRecord>({
      filter: `site = "${siteId}"`,
      sort: 'keyword',
    })
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
  return {
    keywords: list,
    maxKeywords: MAX_KEYWORDS,
  }
})
