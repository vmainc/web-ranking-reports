import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

const MAX_KEYWORDS = 100

export interface RankKeywordRecord {
  id: string
  site: string
  keyword: string
  /** Google Ads monthly search volume (DataForSEO), set when added from keyword research. */
  search_volume?: number | null
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

  // Sort by best position first (1, 2, 3, …), then by keyword.
  const sorted = [...list].sort((a, b) => {
    const pa = typeof a.last_result_json?.position === 'number' && a.last_result_json.position > 0 ? a.last_result_json.position : Number.POSITIVE_INFINITY
    const pbPos = typeof b.last_result_json?.position === 'number' && b.last_result_json.position > 0 ? b.last_result_json.position : Number.POSITIVE_INFINITY
    if (pa !== pbPos) return pa - pbPos
    return a.keyword.localeCompare(b.keyword)
  })

  return {
    keywords: sorted,
    maxKeywords: MAX_KEYWORDS,
  }
})
