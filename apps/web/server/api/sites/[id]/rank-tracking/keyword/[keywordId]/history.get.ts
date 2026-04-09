import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

export interface RankSnapshotRow {
  id: string
  position: number
  fetched_at: string
  url: string
}

export interface KeywordRankingRow {
  id: string
  rank: number
  previous_rank: number | null
  change: number | null
  direction: string
  checked_at: string
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
  await assertSiteOwnership(pb, siteId, userId)

  let kw: { id: string; site?: string }
  try {
    kw = await pb.collection('rank_keywords').getOne(keywordId)
  } catch {
    throw createError({ statusCode: 404, message: 'Keyword not found.' })
  }

  const kwSite = typeof kw.site === 'string' ? kw.site : ''
  if (kwSite !== siteId) {
    throw createError({ statusCode: 404, message: 'Keyword not found for this site.' })
  }

  const keywordText =
    typeof (kw as { keyword?: string }).keyword === 'string' ? (kw as { keyword: string }).keyword : ''

  let snapshots: RankSnapshotRow[] = []
  try {
    const rows = await pb.collection('rank_keyword_snapshots').getFullList<{
      id: string
      position?: number
      fetched_at?: string
      url?: string
    }>({
      filter: `rank_keyword = "${keywordId.replace(/"/g, '\\"')}"`,
      sort: '-fetched_at',
      batch: 500,
    })
    snapshots = rows.map((r) => ({
      id: r.id,
      position: typeof r.position === 'number' ? r.position : 0,
      fetched_at: typeof r.fetched_at === 'string' ? r.fetched_at : '',
      url: typeof r.url === 'string' ? r.url : '',
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
      }>({
        filter: `site = "${siteId}" && keyword = "${escapePbFilterString(keywordText)}"`,
        sort: 'checked_at',
        batch: 500,
      })
      keywordRankings = hist.map((r) => ({
        id: r.id,
        rank: typeof r.rank === 'number' ? r.rank : 0,
        previous_rank: typeof r.previous_rank === 'number' ? r.previous_rank : null,
        change: typeof r.change === 'number' ? r.change : null,
        direction: typeof r.direction === 'string' ? r.direction : 'same',
        checked_at: typeof r.checked_at === 'string' ? r.checked_at : '',
      }))
    } catch {
      keywordRankings = []
    }
  }

  return { snapshots, keywordRankings }
})
