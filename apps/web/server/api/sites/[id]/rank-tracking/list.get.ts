import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { getRankTrackingKeywordLimitContext } from '~/server/utils/rankTrackingLimits'
import { backfillMissingRankKeywordVolumes, getDataForSeoCredentials } from '~/server/utils/dataforseo'
import {
  formatRankContextLabel,
  isResultCurrentForContext,
  resolveSiteRankContext,
} from '~/server/utils/siteRankContext'

export interface RankKeywordRecord {
  id: string
  site: string
  keyword: string
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
    rankingStatus?: string
    contextStale?: boolean
    refreshQueued?: boolean
    location_code?: number
    location_name?: string
    language_code?: string
    device?: string
    search_engine?: string
    changeDirection?: string
    changeSpots?: number | null
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
  const access = await assertSiteAccess(pb, siteId, userId, false)
  const rankContext = resolveSiteRankContext(access.site as { rank_tracking_config?: unknown })

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

  // Backfill US monthly volumes for rows that never got them (old adds / timed-out async tasks).
  const needsVolume = list.some((r) => typeof r.search_volume !== 'number' || Number.isNaN(r.search_volume))
  if (needsVolume) {
    const creds = await getDataForSeoCredentials(pb)
    if (creds) {
      try {
        await backfillMissingRankKeywordVolumes(pb, creds, list)
      } catch (e) {
        console.error('[rank-tracking] volume backfill failed', e)
      }
    }
  }

  const sorted = [...list].sort((a, b) => {
    const currentA = isResultCurrentForContext(a.last_result_json, rankContext)
    const currentB = isResultCurrentForContext(b.last_result_json, rankContext)
    const pa =
      currentA && typeof a.last_result_json?.position === 'number' && a.last_result_json.position > 0
        ? a.last_result_json.position
        : Number.POSITIVE_INFINITY
    const pbPos =
      currentB && typeof b.last_result_json?.position === 'number' && b.last_result_json.position > 0
        ? b.last_result_json.position
        : Number.POSITIVE_INFINITY
    if (pa !== pbPos) return pa - pbPos
    return a.keyword.localeCompare(b.keyword)
  })

  const { maxKeywords, plan } = await getRankTrackingKeywordLimitContext(pb, userId, sorted.length)
  const refreshPending = sorted.some(
    (k) =>
      k.last_result_json?.contextStale === true ||
      k.last_result_json?.rankingStatus === 'pending' ||
      k.last_result_json?.refreshQueued === true,
  )

  return {
    keywords: sorted,
    maxKeywords,
    plan,
    rankContext: {
      locationCode: rankContext.locationCode,
      locationName: rankContext.locationName,
      languageCode: rankContext.languageCode,
      device: rankContext.device,
      os: rankContext.os,
      includeSubdomains: rankContext.includeSubdomains,
      searchEngine: rankContext.searchEngine,
      label: formatRankContextLabel(rankContext),
    },
    refreshPending,
  }
})
