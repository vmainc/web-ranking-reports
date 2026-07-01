/**
 * Shared SERP rank fetch for rank_keywords (DataForSEO + PocketBase updates).
 * Used by the manual API route, post-add hook, and weekly cron.
 */

import type PocketBase from 'pocketbase'
import { fetchSerpRank, getDataForSeoCredentials, type SerpRankResult } from '~/server/utils/dataforseo'
import { computeRankMovement, computeKeywordRankingEntry } from '~/server/utils/rankTrackingChange'

export interface RankKeywordRow {
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

function buildLastResultPayload(result: SerpRankResult, row: RankKeywordRow): Record<string, unknown> {
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

/** True when the prior fetch recorded a real ranking we should not clobber on a transient failure. */
function priorHasRanking(prior: RankKeywordRow['last_result_json']): boolean {
  return !!prior && typeof prior.position === 'number' && prior.position > 0 && !prior.error
}

/**
 * On an API/transport failure, keep the last known-good ranking intact and only attach a
 * non-destructive error marker, so a single bad fetch run doesn't make a report show no
 * rankings at all. Crucially leaves `position`/`fetchedAt` untouched so the UI keeps showing
 * the last real position and its timestamp.
 */
function buildPreservedPayload(
  prior: RankKeywordRow['last_result_json'],
  errorMsg: string,
  errorAtIso: string,
): Record<string, unknown> {
  return {
    ...(prior ?? {}),
    lastFetchError: errorMsg,
    lastFetchErrorAt: errorAtIso,
  }
}

/**
 * Persist a non-destructive error marker on a row that already has a good ranking, and record a
 * "preserved" entry in the results. Intentionally skips snapshot/keyword_ranking inserts so a
 * failed run never poisons history or averages with a 0.
 */
async function preserveRowOnError(
  pb: PocketBase,
  row: RankKeywordRow,
  errorMsg: string,
  errorAtIso: string,
  results: RankFetchRowResult[],
): Promise<void> {
  const prior = row.last_result_json
  const priorPosition = typeof prior?.position === 'number' ? prior.position : 0
  const preserved = buildPreservedPayload(prior, errorMsg, errorAtIso)
  try {
    await pb.collection('rank_keywords').update(row.id, { last_result_json: preserved })
  } catch {
    // If the update itself fails, leave the existing good row untouched.
  }
  results.push({
    id: row.id,
    keyword: row.keyword,
    result: {
      position: priorPosition,
      rankAbsolute: typeof prior?.rankAbsolute === 'number' ? prior.rankAbsolute : 0,
      url: typeof prior?.url === 'string' ? prior.url : '',
      title: typeof prior?.title === 'string' ? prior.title : '',
      description: typeof prior?.description === 'string' ? prior.description : null,
      domain: typeof prior?.domain === 'string' ? prior.domain : '',
      fetchedAt: typeof prior?.fetchedAt === 'string' ? prior.fetchedAt : errorAtIso,
      error: errorMsg,
      errorType: 'api',
    },
    comparison: {
      keyword: row.keyword,
      currentRank: priorPosition,
      previousRank: null,
      change: null,
      direction: 'PRESERVED',
    },
  })
}

export interface RankFetchComparison {
  keyword: string
  currentRank: number
  previousRank: number | null
  change: number | null
  direction: string
}

export interface RankFetchRowResult {
  id: string
  keyword: string
  result: SerpRankResult
  comparison: RankFetchComparison
}

export interface RunRankFetchOptions {
  /** If set, only these rank_keyword row ids (must belong to site). */
  keywordIds?: string[]
  /** Reuse credentials from caller (e.g. cron) to avoid extra PB read. */
  credentials?: { login: string; password: string } | null
}

/**
 * Fetch SERP ranks for a site’s keywords and update PocketBase.
 * @returns `results` for API responses; `updated` is result count.
 */
export async function runRankFetchForSite(
  pb: PocketBase,
  siteId: string,
  domain: string,
  options?: RunRankFetchOptions,
): Promise<{ updated: number; results: RankFetchRowResult[]; skipReason?: string }> {
  const credentials =
    options?.credentials !== undefined ? options.credentials : await getDataForSeoCredentials(pb)
  if (!credentials) {
    return { updated: 0, results: [], skipReason: 'no_dataforseo' }
  }

  const dom = domain.trim()
  if (!dom) {
    return { updated: 0, results: [], skipReason: 'no_domain' }
  }

  let keywords: RankKeywordRow[]
  try {
    const idFilter =
      options?.keywordIds?.length &&
      options.keywordIds.map((id) => `id = "${escapePbFilterString(id)}"`).join(' || ')
    const filter = idFilter ? `site = "${escapePbFilterString(siteId)}" && (${idFilter})` : `site = "${escapePbFilterString(siteId)}"`
    keywords = await pb.collection('rank_keywords').getFullList<RankKeywordRow>({
      filter,
      sort: 'keyword',
    })
  } catch {
    return { updated: 0, results: [], skipReason: 'rank_keywords_unavailable' }
  }

  if (keywords.length === 0) {
    return { updated: 0, results: [] }
  }

  const results: RankFetchRowResult[] = []
  for (const row of keywords) {
    try {
      const result = await fetchSerpRank(credentials, row.keyword, dom)

      // Transient DataForSEO/transport failure: keep the last known-good ranking instead of
      // overwriting it with zeros (which would make the whole report show no rankings).
      if (result.errorType === 'api' && priorHasRanking(row.last_result_json)) {
        await preserveRowOnError(pb, row, result.error || 'Rank fetch failed', result.fetchedAt, results)
        await new Promise((r) => setTimeout(r, 500))
        continue
      }

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
      await new Promise((r) => setTimeout(r, 500))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const fetchedAt = new Date().toISOString()

      // A thrown error is always a transport/API failure, never evidence of a lost ranking.
      // Preserve prior good data when we have it.
      if (priorHasRanking(row.last_result_json)) {
        await preserveRowOnError(pb, row, msg, fetchedAt, results)
        continue
      }

      const errResult: SerpRankResult = {
        position: 0,
        rankAbsolute: 0,
        url: '',
        title: '',
        description: null,
        domain: dom,
        fetchedAt,
        error: msg,
        errorType: 'api',
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
}

/** Sites that have at least one rank_keyword (distinct site ids). */
export async function getSiteIdsWithRankKeywords(pb: PocketBase): Promise<string[]> {
  try {
    const rows = await pb.collection('rank_keywords').getFullList<{ site: string }>({})
    return [...new Set(rows.map((r) => r.site).filter(Boolean))]
  } catch {
    return []
  }
}
