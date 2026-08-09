import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { resolveSiteRankContext, rankingIdentitiesEqual, extractRankingIdentity } from '~/server/utils/siteRankContext'

export interface RankSnapshotRow {
  id: string
  position: number
  fetched_at: string
  url: string
  location_code?: number | null
  location_name?: string | null
  language_code?: string | null
  device?: string | null
  search_engine?: string | null
}

export interface KeywordRankingRow {
  id: string
  rank: number
  previous_rank: number | null
  change: number | null
  direction: string
  checked_at: string
  location_code?: number | null
  device?: string | null
  language_code?: string | null
  search_engine?: string | null
}

function escapePbFilterString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  const keywordId = getRouterParam(event, 'keywordId')
  if (!siteId || !keywordId) throw createError({ statusCode: 400, message: 'Site and keyword id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const site = await assertSiteOwnership(pb, siteId, userId)
  const ctx = resolveSiteRankContext(site as { rank_tracking_config?: unknown })

  let kw: { id: string; site?: string; keyword?: string }
  try {
    kw = await pb.collection('rank_keywords').getOne(keywordId)
  } catch {
    throw createError({ statusCode: 404, message: 'Keyword not found.' })
  }

  const kwSite = typeof kw.site === 'string' ? kw.site : ''
  if (kwSite !== siteId) {
    throw createError({ statusCode: 404, message: 'Keyword not found for this site.' })
  }

  const keywordText = typeof kw.keyword === 'string' ? kw.keyword : ''

  let snapshots: RankSnapshotRow[] = []
  try {
    const rows = await pb.collection('rank_keyword_snapshots').getFullList<{
      id: string
      position?: number
      fetched_at?: string
      url?: string
      location_code?: number
      location_name?: string
      language_code?: string
      device?: string
      search_engine?: string
    }>({
      filter: `rank_keyword = "${keywordId.replace(/"/g, '\\"')}"`,
      sort: '-fetched_at',
      batch: 500,
    })
    snapshots = rows
      .filter((r) => {
        const id = extractRankingIdentity(r)
        if (!id) {
          // Legacy snapshots: include only when current context is US desktop baseline
          return ctx.locationCode === 2840 && ctx.device === 'desktop' && ctx.languageCode === 'en'
        }
        return rankingIdentitiesEqual(id, {
          locationCode: ctx.locationCode,
          languageCode: ctx.languageCode,
          device: ctx.device,
          searchEngine: ctx.searchEngine,
        })
      })
      .map((r) => ({
        id: r.id,
        position: typeof r.position === 'number' ? r.position : 0,
        fetched_at: typeof r.fetched_at === 'string' ? r.fetched_at : '',
        url: typeof r.url === 'string' ? r.url : '',
        location_code: typeof r.location_code === 'number' ? r.location_code : null,
        location_name: typeof r.location_name === 'string' ? r.location_name : null,
        language_code: typeof r.language_code === 'string' ? r.language_code : null,
        device: typeof r.device === 'string' ? r.device : null,
        search_engine: typeof r.search_engine === 'string' ? r.search_engine : null,
      }))
  } catch {
    snapshots = []
  }

  let keywordRankings: KeywordRankingRow[] = []
  if (keywordText) {
    try {
      const hist = await pb.collection('keyword_rankings').getFullList<{
        id: string
        rank?: number
        previous_rank?: number | null
        change?: number | null
        direction?: string
        checked_at?: string
        location_code?: number
        language_code?: string
        device?: string
        search_engine?: string
      }>({
        filter: `site = "${siteId}" && keyword = "${escapePbFilterString(keywordText)}"`,
        sort: 'checked_at',
        batch: 500,
      })
      keywordRankings = hist
        .filter((r) => {
          const id = extractRankingIdentity(r)
          if (!id) {
            return ctx.locationCode === 2840 && ctx.device === 'desktop' && ctx.languageCode === 'en'
          }
          return rankingIdentitiesEqual(id, {
            locationCode: ctx.locationCode,
            languageCode: ctx.languageCode,
            device: ctx.device,
            searchEngine: ctx.searchEngine,
          })
        })
        .map((r) => ({
          id: r.id,
          rank: typeof r.rank === 'number' ? r.rank : 0,
          previous_rank: typeof r.previous_rank === 'number' ? r.previous_rank : null,
          change: typeof r.change === 'number' ? r.change : null,
          direction: typeof r.direction === 'string' ? r.direction : 'same',
          checked_at: typeof r.checked_at === 'string' ? r.checked_at : '',
          location_code: typeof r.location_code === 'number' ? r.location_code : null,
          device: typeof r.device === 'string' ? r.device : null,
          language_code: typeof r.language_code === 'string' ? r.language_code : null,
          search_engine: typeof r.search_engine === 'string' ? r.search_engine : null,
        }))
    } catch {
      keywordRankings = []
    }
  }

  return {
    snapshots,
    keywordRankings,
    rankContext: {
      locationCode: ctx.locationCode,
      locationName: ctx.locationName,
      languageCode: ctx.languageCode,
      device: ctx.device,
      searchEngine: ctx.searchEngine,
    },
  }
})
