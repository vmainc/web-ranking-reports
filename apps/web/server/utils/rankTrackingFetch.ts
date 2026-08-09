/**
 * Shared SERP rank fetch for rank_keywords (DataForSEO + PocketBase updates).
 * Used by the manual API route, post-add hook, weekly cron, and location-change refresh.
 */

import type PocketBase from 'pocketbase'
import { fetchSerpRank, getDataForSeoCredentials, type SerpRankResult } from '~/server/utils/dataforseo'
import { computeRankMovement, computeKeywordRankingEntry } from '~/server/utils/rankTrackingChange'
import { isTransientRankingFailure, resolveStoredRankingStatus } from '~/server/utils/rankingStatus'
import {
  extractRankingIdentity,
  isResultCurrentForContext,
  rankingContextPersistFields,
  rankingIdentitiesEqual,
  rankingIdentityFromContext,
  resolveSiteRankContext,
  type SiteRankContext,
} from '~/server/utils/siteRankContext'

export interface RankKeywordRow {
  id: string
  site: string
  keyword: string
  last_result_json?: {
    position?: number
    fetchedAt?: string
    error?: string
    rankingStatus?: string
    errorType?: string
    contextStale?: boolean
    location_code?: number
    language_code?: string
    device?: string
    search_engine?: string
    [key: string]: unknown
  } | null
}

async function tryInsertSnapshot(
  pb: PocketBase,
  rankKeywordId: string,
  position: number,
  fetchedAtIso: string,
  url: string,
  ctx: SiteRankContext,
): Promise<void> {
  try {
    await pb.collection('rank_keyword_snapshots').create({
      rank_keyword: rankKeywordId,
      position,
      fetched_at: fetchedAtIso,
      url: url ? String(url).slice(0, 2000) : '',
      location_code: ctx.locationCode,
      location_name: ctx.locationName,
      language_code: ctx.languageCode,
      device: ctx.device,
      os: ctx.os,
      search_engine: ctx.searchEngine,
    })
  } catch {
    // Collection missing until migration; rank row still updates.
  }
}

function escapePbFilterString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

async function getLastKeywordRankingRank(
  pb: PocketBase,
  siteId: string,
  keyword: string,
  ctx: SiteRankContext,
): Promise<{ rank: number; sameIdentity: boolean } | null> {
  try {
    // Prefer identity-scoped history when fields exist; fall back to latest row.
    let res
    try {
      res = await pb.collection('keyword_rankings').getList(1, 1, {
        filter: `site = "${siteId}" && keyword = "${escapePbFilterString(keyword)}" && location_code = ${ctx.locationCode} && language_code = "${escapePbFilterString(ctx.languageCode)}" && device = "${ctx.device}" && search_engine = "${ctx.searchEngine}"`,
        sort: '-checked_at',
      })
    } catch {
      res = await pb.collection('keyword_rankings').getList(1, 1, {
        filter: `site = "${siteId}" && keyword = "${escapePbFilterString(keyword)}"`,
        sort: '-checked_at',
      })
    }
    const row = res.items[0] as {
      rank?: number
      location_code?: number
      language_code?: string
      device?: string
      search_engine?: string
    } | undefined
    if (!row || typeof row.rank !== 'number') return null
    const id = extractRankingIdentity(row)
    const sameIdentity = id
      ? rankingIdentitiesEqual(id, rankingIdentityFromContext(ctx))
      : // Legacy row without identity: only comparable when current context is US desktop baseline
        ctx.locationCode === 2840 && ctx.languageCode === 'en' && ctx.device === 'desktop'
    return { rank: row.rank, sameIdentity }
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
  ctx: SiteRankContext,
): Promise<{
  currentRank: number
  previousRank: number | null
  change: number | null
  direction: string
}> {
  const last = await getLastKeywordRankingRank(pb, siteId, keyword, ctx)
  const entry = computeKeywordRankingEntry(last?.rank ?? null, currentRank, last?.sameIdentity !== false && !!last)
  try {
    await pb.collection('keyword_rankings').create({
      site: siteId,
      keyword,
      rank: entry.rank,
      previous_rank: entry.previous_rank,
      change: entry.change,
      direction: entry.direction,
      checked_at: checkedAtIso,
      location_code: ctx.locationCode,
      location_name: ctx.locationName,
      language_code: ctx.languageCode,
      device: ctx.device,
      os: ctx.os,
      search_engine: ctx.searchEngine,
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

/** Persistable last_result_json — strips debug/raw blobs; stamps ranking identity. */
function buildLastResultPayload(
  result: SerpRankResult,
  row: RankKeywordRow,
  ctx: SiteRankContext,
): Record<string, unknown> {
  const prior = row.last_result_json
  const priorIdentity = extractRankingIdentity(prior ?? undefined)
  const currentIdentity = rankingIdentityFromContext(ctx)
  const sameIdentity = priorIdentity
    ? rankingIdentitiesEqual(priorIdentity, currentIdentity)
    : isResultCurrentForContext(prior, ctx) && !prior?.contextStale

  const hadPriorFetch = !!(
    prior &&
    typeof prior.fetchedAt === 'string' &&
    prior.fetchedAt.length > 0 &&
    sameIdentity &&
    !prior.contextStale
  )
  const prevPos = typeof prior?.position === 'number' ? prior.position : null
  const movement = computeRankMovement(prevPos, result.position, hadPriorFetch, sameIdentity)

  const payload: Record<string, unknown> = {
    position: result.position,
    rankAbsolute: result.rankAbsolute,
    url: result.url,
    title: result.title,
    description: result.description,
    domain: result.domain,
    fetchedAt: result.fetchedAt,
    serpType: result.serpType ?? 'organic',
    rankingStatus: result.rankingStatus,
    previousPosition: movement.previousPosition,
    changeSpots: movement.changeSpots,
    changeDirection: movement.changeDirection,
    ...rankingContextPersistFields(ctx),
    contextStale: false,
  }

  if (result.additionalMatches?.length) {
    payload.additionalMatches = result.additionalMatches
  }
  if (result.serpSummary) {
    payload.serpSummary = result.serpSummary
  }

  if (result.rankingStatus === 'not_ranked_within_tracked_depth') {
    // no error field
  } else if (result.error) {
    payload.error = result.error
    payload.errorType = result.errorType
  }

  return payload
}

function priorHasRanking(prior: RankKeywordRow['last_result_json'], ctx: SiteRankContext): boolean {
  if (!prior || prior.contextStale) return false
  if (!isResultCurrentForContext(prior, ctx)) return false
  const status = resolveStoredRankingStatus(prior)
  if (status === 'ranked') return typeof prior.position === 'number' && prior.position > 0
  return typeof prior.position === 'number' && prior.position > 0 && !prior.error
}

function shouldPreservePrior(result: SerpRankResult): boolean {
  return isTransientRankingFailure(result.rankingStatus)
}

function buildPreservedPayload(
  prior: RankKeywordRow['last_result_json'],
  errorMsg: string,
  errorAtIso: string,
  rankingStatus: SerpRankResult['rankingStatus'],
): Record<string, unknown> {
  return {
    ...(prior ?? {}),
    lastFetchError: errorMsg,
    lastFetchErrorAt: errorAtIso,
    rankingStatus,
  }
}

async function preserveRowOnError(
  pb: PocketBase,
  row: RankKeywordRow,
  errorMsg: string,
  errorAtIso: string,
  rankingStatus: SerpRankResult['rankingStatus'],
  results: RankFetchRowResult[],
): Promise<void> {
  const prior = row.last_result_json
  const priorPosition = typeof prior?.position === 'number' ? prior.position : 0
  const preserved = buildPreservedPayload(prior, errorMsg, errorAtIso, rankingStatus)
  try {
    await pb.collection('rank_keywords').update(row.id, { last_result_json: preserved })
  } catch {
    // leave existing good row untouched
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
      rankingStatus,
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
  keywordIds?: string[]
  credentials?: { login: string; password: string } | null
  /** Override site context (rare; prefer loading from site). */
  rankContext?: SiteRankContext
  /** Site record or partial with rank_tracking_config. */
  siteRecord?: { rank_tracking_config?: unknown; domain?: string; [key: string]: unknown } | null
}

/**
 * Fetch SERP ranks for a site’s keywords and update PocketBase.
 */
export async function runRankFetchForSite(
  pb: PocketBase,
  siteId: string,
  domain: string,
  options?: RunRankFetchOptions,
): Promise<{ updated: number; results: RankFetchRowResult[]; skipReason?: string; context?: SiteRankContext }> {
  const credentials =
    options?.credentials !== undefined ? options.credentials : await getDataForSeoCredentials(pb)
  if (!credentials) {
    return { updated: 0, results: [], skipReason: 'no_dataforseo' }
  }

  const dom = domain.trim()
  if (!dom) {
    return { updated: 0, results: [], skipReason: 'no_domain' }
  }

  let siteRecord = options?.siteRecord
  if (!siteRecord) {
    try {
      siteRecord = await pb.collection('sites').getOne(siteId)
    } catch {
      siteRecord = null
    }
  }
  const ctx = options?.rankContext ?? resolveSiteRankContext(siteRecord)

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
    return { updated: 0, results: [], skipReason: 'rank_keywords_unavailable', context: ctx }
  }

  if (keywords.length === 0) {
    return { updated: 0, results: [], context: ctx }
  }

  const results: RankFetchRowResult[] = []
  for (const row of keywords) {
    try {
      const result = await fetchSerpRank(credentials, row.keyword, dom, {
        locationCode: ctx.locationCode,
        locationLabel: ctx.locationName,
        languageCode: ctx.languageCode,
        device: ctx.device,
        os: ctx.os,
        includeSubdomains: ctx.includeSubdomains,
        // Production: never send DataForSEO target.
        useApiTargetFilter: false,
      })

      if (shouldPreservePrior(result) && priorHasRanking(row.last_result_json, ctx)) {
        await preserveRowOnError(
          pb,
          row,
          result.error || 'Rank fetch failed',
          result.fetchedAt,
          result.rankingStatus,
          results,
        )
        await new Promise((r) => setTimeout(r, 500))
        continue
      }

      const last_result_json = buildLastResultPayload(result, row, ctx)
      await pb.collection('rank_keywords').update(row.id, {
        last_result_json,
      })

      const conclusive =
        result.rankingStatus === 'ranked' || result.rankingStatus === 'not_ranked_within_tracked_depth'
      if (conclusive) {
        await tryInsertSnapshot(pb, row.id, result.position, result.fetchedAt, result.url || '', ctx)
        const comparison = await tryInsertKeywordRanking(
          pb,
          siteId,
          row.keyword,
          result.position,
          result.fetchedAt,
          ctx,
        )
        results.push({
          id: row.id,
          keyword: row.keyword,
          result,
          comparison: { keyword: row.keyword, ...comparison },
        })
      } else {
        results.push({
          id: row.id,
          keyword: row.keyword,
          result,
          comparison: {
            keyword: row.keyword,
            currentRank: result.position,
            previousRank: null,
            change: null,
            direction: 'ERROR',
          },
        })
      }
      await new Promise((r) => setTimeout(r, 500))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const fetchedAt = new Date().toISOString()

      if (priorHasRanking(row.last_result_json, ctx)) {
        await preserveRowOnError(pb, row, msg, fetchedAt, 'api_error', results)
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
        rankingStatus: 'api_error',
      }
      const last_result_json = buildLastResultPayload(errResult, row, ctx)
      await pb.collection('rank_keywords').update(row.id, {
        last_result_json,
      })
      results.push({
        id: row.id,
        keyword: row.keyword,
        result: errResult,
        comparison: {
          keyword: row.keyword,
          currentRank: 0,
          previousRank: null,
          change: null,
          direction: 'ERROR',
        },
      })
    }
  }

  return { updated: results.length, results, context: ctx }
}

/**
 * After ranking location/config change: mark current results stale and refresh in background.
 * Does not delete history.
 */
export async function markRankKeywordsContextStale(pb: PocketBase, siteId: string): Promise<number> {
  let keywords: RankKeywordRow[] = []
  try {
    keywords = await pb.collection('rank_keywords').getFullList<RankKeywordRow>({
      filter: `site = "${escapePbFilterString(siteId)}"`,
    })
  } catch {
    return 0
  }
  let n = 0
  for (const row of keywords) {
    const prior = row.last_result_json ?? {}
    try {
      await pb.collection('rank_keywords').update(row.id, {
        last_result_json: {
          ...prior,
          contextStale: true,
          changeSpots: null,
          changeDirection: 'none',
          previousPosition: null,
          rankingStatus: 'pending',
        },
      })
      n += 1
    } catch {
      // continue
    }
  }
  return n
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
