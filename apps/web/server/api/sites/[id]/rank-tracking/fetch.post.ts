import type PocketBase from 'pocketbase'
import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import {
  getDataForSeoCredentials,
  fetchSerpRank,
  type SerpRankResult,
} from '~/server/utils/dataforseo'
import { computeRankMovement, computeKeywordRankingEntry } from '~/server/utils/rankTrackingChange'

interface RankKeywordRow {
  id: string
  site: string
  keyword: string
  last_result_json?: {
    position?: number
    fetchedAt?: string
    [key: string]: unknown
  } | null
}

async function tryInsertSnapshot(
  pb: PocketBase,
  rankKeywordId: string,
  position: number,
  fetchedAtIso: string,
  url: string,
): Promise<void> {
  try {
    await pb.collection('rank_keyword_snapshots').create({
      rank_keyword: rankKeywordId,
      position,
      fetched_at: fetchedAtIso,
      url: url ? String(url).slice(0, 2000) : '',
    })
  } catch {
    // Collection missing until migration; rank row still updates.
  }
}

function escapePbFilterString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/** Last saved `rank` from append-only history (null if no rows). */
async function getLastKeywordRankingRank(pb: PocketBase, siteId: string, keyword: string): Promise<number | null> {
  try {
    const res = await pb.collection('keyword_rankings').getList(1, 1, {
      filter: `site = "${siteId}" && keyword = "${escapePbFilterString(keyword)}"`,
      sort: '-checked_at',
    })
    const row = res.items[0] as { rank?: number } | undefined
    if (!row || typeof row.rank !== 'number') return null
    return row.rank
  } catch {
    return null
  }
}

async function tryInsertKeywordRanking(
  pb: PocketBase,
  siteId: string,
  keyword: string,
  currentRank: number,
  checkedAtIso: string,
): Promise<{
  currentRank: number
  previousRank: number | null
  change: number | null
  direction: string
}> {
  const lastRank = await getLastKeywordRankingRank(pb, siteId, keyword)
  const entry = computeKeywordRankingEntry(lastRank, currentRank)
  try {
    await pb.collection('keyword_rankings').create({
      site: siteId,
      keyword,
      rank: entry.rank,
      previous_rank: entry.previous_rank,
      change: entry.change,
      direction: entry.direction,
      checked_at: checkedAtIso,
    })
  } catch {
    // Collection missing until create-collections; rank_keywords row still updates.
  }
  return {
    currentRank: entry.rank,
    previousRank: entry.previous_rank,
    change: entry.change,
    direction: entry.direction.toUpperCase(),
  }
}

function buildLastResultPayload(
  result: SerpRankResult,
  row: RankKeywordRow,
): Record<string, unknown> {
  const prior = row.last_result_json
  const hadPriorFetch = !!(prior && typeof prior.fetchedAt === 'string' && prior.fetchedAt.length > 0)
  const prevPos = typeof prior?.position === 'number' ? prior.position : null
  const movement = computeRankMovement(prevPos, result.position, hadPriorFetch)

  return {
    position: result.position,
    rankAbsolute: result.rankAbsolute,
    url: result.url,
    title: result.title,
    description: result.description,
    domain: result.domain,
    fetchedAt: result.fetchedAt,
    error: result.error,
    previousPosition: movement.previousPosition,
    changeSpots: movement.changeSpots,
    changeDirection: movement.changeDirection,
  }
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const site = await assertSiteOwnership(pb, siteId, userId)
  const domain = (site as { domain?: string }).domain
  if (!domain?.trim()) throw createError({ statusCode: 400, message: 'Site has no domain' })

  const credentials = await getDataForSeoCredentials(pb)
  if (!credentials) {
    throw createError({
      statusCode: 503,
      message: 'DataForSEO is not configured. An admin can add credentials in Admin → Integrations.',
    })
  }

  let keywords: RankKeywordRow[]
  try {
    keywords = await pb.collection('rank_keywords').getFullList<RankKeywordRow>({
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
  if (keywords.length === 0) {
    return { updated: 0, message: 'No keywords to fetch.' }
  }

  const results: Array<{
    id: string
    keyword: string
    result: SerpRankResult
    comparison: {
      keyword: string
      currentRank: number
      previousRank: number | null
      change: number | null
      direction: string
    }
  }> = []
  for (const row of keywords) {
    try {
      const result = await fetchSerpRank(credentials, row.keyword, domain)
      const last_result_json = buildLastResultPayload(result, row)
      await pb.collection('rank_keywords').update(row.id, {
        last_result_json,
      })
      await tryInsertSnapshot(pb, row.id, result.position, result.fetchedAt, result.url || '')
      const comparison = await tryInsertKeywordRanking(pb, siteId, row.keyword, result.position, result.fetchedAt)
      results.push({
        id: row.id,
        keyword: row.keyword,
        result,
        comparison: {
          keyword: row.keyword,
          ...comparison,
        },
      })
      // Avoid rate limits: short delay between requests (DataForSEO allows 2000/min but be conservative)
      await new Promise((r) => setTimeout(r, 500))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const fetchedAt = new Date().toISOString()
      const errResult: SerpRankResult = {
        position: 0,
        rankAbsolute: 0,
        url: '',
        title: '',
        description: null,
        domain,
        fetchedAt,
        error: msg,
      }
      const last_result_json = buildLastResultPayload(errResult, row)
      await pb.collection('rank_keywords').update(row.id, {
        last_result_json,
      })
      await tryInsertSnapshot(pb, row.id, 0, fetchedAt, '')
      const comparison = await tryInsertKeywordRanking(pb, siteId, row.keyword, 0, fetchedAt)
      results.push({
        id: row.id,
        keyword: row.keyword,
        result: errResult,
        comparison: {
          keyword: row.keyword,
          ...comparison,
        },
      })
    }
  }

  return { updated: results.length, results }
})
