/**
 * DataForSEO Google Organic SERP API (v3) for rank tracking.
 * Uses Live Advanced endpoint. Domain matching is done client-side with bulletproof
 * host comparison; DataForSEO `target` uses page/subdomain wildcards (never homepage-only).
 *
 * Keyword monthly volumes: Keywords Data API → Google Ads → search_volume task POST+GET.
 */

import type PocketBase from 'pocketbase'
import {
  buildDataForSeoTarget,
  normalizeRankingHostname,
  selectOrganicDomainMatches,
} from '~/server/utils/rankingDomain'
import type { RankingCheckStatus } from '~/server/utils/rankingStatus'
import { normalizeTrackedKeyword, keywordDedupeKey } from '~/server/utils/keywordNormalize'
import { buildCompactSerpSummary, type CompactSerpSummary } from '~/server/utils/serpSummary'
import {
  RANK_TRACKING_DEFAULT_DEVICE,
  RANK_TRACKING_DEFAULT_LANGUAGE_CODE,
  RANK_TRACKING_DEFAULT_LOCATION_CODE,
  RANK_TRACKING_DEFAULT_LOCATION_NAME,
  RANK_TRACKING_DEFAULT_OS,
  defaultOsForRankDevice,
} from '~/server/utils/siteRankContext'

const SERP_URL = 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced'

/** Track organic rankings through position 100 (DataForSEO depth max 200). */
export const RANK_TRACKING_SERP_DEPTH = 100
/** @deprecated Prefer imports from siteRankContext — kept for existing callers. */
export const RANK_TRACKING_DEFAULT_LOCATION_LABEL = RANK_TRACKING_DEFAULT_LOCATION_NAME
export {
  RANK_TRACKING_DEFAULT_LOCATION_CODE,
  RANK_TRACKING_DEFAULT_LANGUAGE_CODE,
  RANK_TRACKING_DEFAULT_DEVICE,
  RANK_TRACKING_DEFAULT_OS,
}

/**
 * Minimum organic results required before we confidently say "not in top N".
 * Fewer organics with no match → incomplete (do not treat as not ranking).
 */
export const MIN_ORGANIC_FOR_CONFIDENT_ABSENCE = 20

const SEARCH_VOLUME_LIVE_URL = 'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live'
/** DataForSEO limit per keyword for Google Ads search volume tasks */
const DATAFORSEO_SEARCH_VOLUME_MAX_KEYWORD_LEN = 80
/** Standard Google Ads search volume: max keywords per task (DataForSEO docs). */
const SEARCH_VOLUME_CHUNK = 1000
/** Spread multiple Live submissions slightly to stay under ~12 rpm Live limit. */
const SEARCH_VOLUME_CHUNK_DELAY_MS = 5500

export interface SerpOrganicMatchSummary {
  position: number
  rankAbsolute: number
  url: string
  title: string
  description: string | null
  domain: string
  serpType: string
}

export interface RankingCheckDebugMeta {
  keyword: string
  siteDomain: string
  normalizedHostname: string
  dataForSeoTarget: string
  requestedLocationCode: number
  resolvedLocationCode: number
  resolvedLocationLabel: string
  languageCode: string
  device: string
  os: string
  requestedDepth: number
  httpStatus: number | null
  dataForSeoStatusCode: number | null
  taskStatusCode: number | null
  totalItems: number
  organicItems: number
  matchingOrganicCount: number
  domainMatches: Array<{ position: number; url: string; title?: string }>
  selectedRank: number | null
  selectedUrl: string | null
  rankingStatus: RankingCheckStatus
  durationMs: number
  seResultsCount: number | null
  itemsCount: number | null
}

export interface SerpRankResult {
  position: number
  rankAbsolute: number
  url: string
  title: string
  description: string | null
  domain: string
  fetchedAt: string
  serpType?: string
  rankingStatus: RankingCheckStatus
  /**
   * Legacy classifier (kept for older callers):
   * - `api`: transport / DataForSEO failure
   * - `not_ranked`: confident absence within tracked depth
   * - `incomplete`: response too thin to conclude absence
   * - `parsing`: malformed response
   */
  errorType?: 'api' | 'not_ranked' | 'incomplete' | 'parsing'
  error?: string
  additionalMatches?: Array<{ position: number; url: string; title?: string }>
  /** Compact SERP summary for future competitors / features (not raw dump). */
  serpSummary?: CompactSerpSummary
  debug?: RankingCheckDebugMeta
  /** Present only when fetch options.requestRawDebug is true (sanitized). */
  rawDebug?: unknown
}

export interface FetchSerpRankOptions {
  locationCode?: number
  locationLabel?: string
  languageCode?: string
  device?: 'desktop' | 'mobile'
  os?: string
  depth?: number
  /** Default true — match blog.example.com when tracking example.com. */
  includeSubdomains?: boolean
  /**
   * When true, send DataForSEO `target` wildcard (diagnose/experiments only).
   * Production rank tracking MUST leave this false/undefined so we get the full SERP.
   */
  useApiTargetFilter?: boolean
  /** Attach structured debug meta on the result (always logged server-side at info level). */
  includeDebug?: boolean
  /** Attach a sanitized slice of the raw DataForSEO response (dev/diagnose only). */
  requestRawDebug?: boolean
}

/** Normalize domain for DataForSEO Labs/backlinks target: bare host, no protocol/www/path. */
export function normalizeTargetDomain(domain: string): string {
  return normalizeRankingHostname(domain) || domain.trim()
}

/** Get DataForSEO credentials from app_settings. */
export async function getDataForSeoCredentials(pb: PocketBase): Promise<{ login: string; password: string } | null> {
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value: { login?: string; password?: string } }>('key="dataforseo"')
    const v = row?.value
    if (v?.login && v?.password) return { login: v.login, password: v.password }
  } catch {
    // no row or missing collection
  }
  return null
}

interface SerpOrganicItem {
  type?: string
  rank_group?: number
  rank_absolute?: number
  domain?: string
  url?: string
  title?: string
  description?: string
}

interface SerpTaskResult {
  keyword?: string
  items?: SerpOrganicItem[]
  status_code?: number
  status_message?: string
  se_results_count?: number
  items_count?: number
  location_code?: number
  language_code?: string
  check_url?: string
}

interface SerpResponse {
  status_code?: number
  status_message?: string
  tasks?: Array<{
    id?: string
    status_code?: number
    status_message?: string
    result?: SerpTaskResult[]
  }>
}

function defaultOsForDevice(device: 'desktop' | 'mobile'): string {
  return defaultOsForRankDevice(device)
}

function logRankingCheck(meta: RankingCheckDebugMeta): void {
  // Never log credentials. Structured one-liner for production diagnosis.
  console.info(
    '[rank-tracking]',
    JSON.stringify({
      keyword: meta.keyword,
      site: meta.siteDomain,
      host: meta.normalizedHostname,
      target: meta.dataForSeoTarget,
      location: meta.resolvedLocationCode,
      locationLabel: meta.resolvedLocationLabel,
      language: meta.languageCode,
      device: meta.device,
      depth: meta.requestedDepth,
      dfsStatus: meta.dataForSeoStatusCode,
      taskStatus: meta.taskStatusCode,
      items: meta.totalItems,
      organic: meta.organicItems,
      matches: meta.matchingOrganicCount,
      selectedRank: meta.selectedRank,
      selectedUrl: meta.selectedUrl,
      status: meta.rankingStatus,
      durationMs: meta.durationMs,
    }),
  )
}

function sanitizeRawForDebug(data: SerpResponse | null): unknown {
  if (!data) return null
  const task = data.tasks?.[0]
  const result = task?.result?.[0]
  const items = (result?.items ?? []).slice(0, 120).map((item) => ({
    type: item.type,
    rank_group: item.rank_group,
    rank_absolute: item.rank_absolute,
    domain: item.domain,
    url: item.url,
    title: item.title,
  }))
  return {
    status_code: data.status_code,
    status_message: data.status_message,
    task: {
      id: task?.id,
      status_code: task?.status_code,
      status_message: task?.status_message,
      result: result
        ? {
            keyword: result.keyword,
            location_code: result.location_code,
            language_code: result.language_code,
            se_results_count: result.se_results_count,
            items_count: result.items_count,
            items,
          }
        : null,
    },
  }
}

function emptyResult(
  partial: Omit<SerpRankResult, 'position' | 'rankAbsolute' | 'url' | 'title' | 'description'> & {
    position?: number
    rankAbsolute?: number
    url?: string
    title?: string
    description?: string | null
  },
): SerpRankResult {
  return {
    position: partial.position ?? 0,
    rankAbsolute: partial.rankAbsolute ?? 0,
    url: partial.url ?? '',
    title: partial.title ?? '',
    description: partial.description ?? null,
    domain: partial.domain,
    fetchedAt: partial.fetchedAt,
    serpType: partial.serpType,
    rankingStatus: partial.rankingStatus,
    errorType: partial.errorType,
    error: partial.error,
    additionalMatches: partial.additionalMatches,
    serpSummary: partial.serpSummary,
    debug: partial.debug,
    rawDebug: partial.rawDebug,
  }
}

/**
 * Pure parser: map a DataForSEO Live Advanced response into a rank result.
 * Exported for unit tests — does not perform network I/O.
 */
export function parseSerpRankResponse(
  data: SerpResponse | null,
  args: {
    keyword: string
    targetDomain: string
    normalizedHostname: string
    dataForSeoTarget: string
    locationCode: number
    locationLabel: string
    languageCode: string
    device: string
    os: string
    depth: number
    includeSubdomains: boolean
    /** When true, DataForSEO already filtered to our target — empty items means not ranked. */
    usedApiTargetFilter: boolean
    fetchedAt: string
    httpStatus: number | null
    durationMs: number
    includeDebug?: boolean
    requestRawDebug?: boolean
  },
): SerpRankResult {
  const baseDebug = (): RankingCheckDebugMeta => ({
    keyword: args.keyword,
    siteDomain: args.targetDomain,
    normalizedHostname: args.normalizedHostname,
    dataForSeoTarget: args.dataForSeoTarget,
    requestedLocationCode: args.locationCode,
    resolvedLocationCode: args.locationCode,
    resolvedLocationLabel: args.locationLabel,
    languageCode: args.languageCode,
    device: args.device,
    os: args.os,
    requestedDepth: args.depth,
    httpStatus: args.httpStatus,
    dataForSeoStatusCode: data?.status_code ?? null,
    taskStatusCode: data?.tasks?.[0]?.status_code ?? null,
    totalItems: 0,
    organicItems: 0,
    matchingOrganicCount: 0,
    domainMatches: [],
    selectedRank: null,
    selectedUrl: null,
    rankingStatus: 'api_error',
    durationMs: args.durationMs,
    seResultsCount: null,
    itemsCount: null,
  })

  const finish = (result: SerpRankResult, meta: RankingCheckDebugMeta): SerpRankResult => {
    logRankingCheck(meta)
    if (args.includeDebug) result.debug = meta
    if (args.requestRawDebug) result.rawDebug = sanitizeRawForDebug(data)
    return result
  }

  if (!data || typeof data !== 'object') {
    const debug = { ...baseDebug(), rankingStatus: 'parsing_error' as const }
    return finish(
      emptyResult({
        domain: args.normalizedHostname,
        fetchedAt: args.fetchedAt,
        rankingStatus: 'parsing_error',
        errorType: 'parsing',
        error: 'Malformed DataForSEO response',
      }),
      debug,
    )
  }

  if (data.status_code !== 20000 || !data.tasks?.length) {
    const msg = data.status_message ?? `DataForSEO status ${data.status_code ?? 'unknown'}`
    const debug = { ...baseDebug(), rankingStatus: 'api_error' as const }
    return finish(
      emptyResult({
        domain: args.normalizedHostname,
        fetchedAt: args.fetchedAt,
        rankingStatus: 'api_error',
        errorType: 'api',
        error: msg,
      }),
      debug,
    )
  }

  const task = data.tasks[0]
  const firstResult = task?.result?.[0]
  if (task?.status_code !== 20000) {
    const msg = firstResult?.status_message ?? task?.status_message ?? 'DataForSEO task failed'
    const debug = {
      ...baseDebug(),
      taskStatusCode: task?.status_code ?? null,
      rankingStatus: 'api_error' as const,
      resolvedLocationCode: firstResult?.location_code ?? args.locationCode,
    }
    return finish(
      emptyResult({
        domain: args.normalizedHostname,
        fetchedAt: args.fetchedAt,
        rankingStatus: 'api_error',
        errorType: 'api',
        error: msg,
      }),
      debug,
    )
  }

  const items = Array.isArray(firstResult?.items) ? firstResult!.items! : []
  const organicItems = items.filter((i) => i.type === 'organic')
  const resolvedLocationCode = firstResult?.location_code ?? args.locationCode
  const matchMode = args.includeSubdomains ? 'include_subdomains' : 'www_equivalent'
  const matches = selectOrganicDomainMatches(items, args.targetDomain, { mode: matchMode })
  const serpSummary = buildCompactSerpSummary(items)

  const domainMatches = matches.map((m) => ({
    position: m.organicPosition,
    url: m.url ?? '',
    title: m.title,
  }))

  const debugBase: RankingCheckDebugMeta = {
    ...baseDebug(),
    resolvedLocationCode,
    totalItems: items.length,
    organicItems: organicItems.length,
    matchingOrganicCount: matches.length,
    domainMatches: domainMatches.map((m) => ({ position: m.position, url: m.url, title: m.title })),
    seResultsCount: typeof firstResult?.se_results_count === 'number' ? firstResult.se_results_count : null,
    itemsCount: typeof firstResult?.items_count === 'number' ? firstResult.items_count : null,
  }

  if (matches.length > 0) {
    const best = matches[0]!
    const additionalMatches = matches.slice(1, 10).map((m) => ({
      position: m.organicPosition,
      url: m.url ?? '',
      title: m.title,
    }))
    const debug: RankingCheckDebugMeta = {
      ...debugBase,
      selectedRank: best.organicPosition,
      selectedUrl: best.url ?? null,
      rankingStatus: 'ranked',
    }
    return finish(
      {
        position: best.organicPosition,
        rankAbsolute: best.rank_absolute ?? 0,
        url: best.url ?? '',
        title: best.title ?? '',
        description: best.description ?? null,
        domain: best.domain ?? best.matchHost ?? args.normalizedHostname,
        fetchedAt: args.fetchedAt,
        serpType: best.type ?? 'organic',
        rankingStatus: 'ranked',
        additionalMatches: additionalMatches.length ? additionalMatches : undefined,
        serpSummary,
      },
      debug,
    )
  }

  // No domain matches.
  // With API target filter (diagnose only), empty ⇒ not in crawl depth.
  // Production full-SERP path requires enough organic rows before claiming absence.
  if (!args.usedApiTargetFilter && organicItems.length < MIN_ORGANIC_FOR_CONFIDENT_ABSENCE) {
    const debug: RankingCheckDebugMeta = {
      ...debugBase,
      rankingStatus: 'incomplete',
    }
    return finish(
      emptyResult({
        domain: args.normalizedHostname,
        fetchedAt: args.fetchedAt,
        rankingStatus: 'incomplete',
        errorType: 'incomplete',
        error: `Incomplete SERP: only ${organicItems.length} organic results (need ≥${MIN_ORGANIC_FOR_CONFIDENT_ABSENCE} to confirm absence within top ${args.depth})`,
        serpSummary,
      }),
      debug,
    )
  }

  const debug: RankingCheckDebugMeta = {
    ...debugBase,
    rankingStatus: 'not_ranked_within_tracked_depth',
  }
  return finish(
    emptyResult({
      domain: args.normalizedHostname,
      fetchedAt: args.fetchedAt,
      rankingStatus: 'not_ranked_within_tracked_depth',
      errorType: 'not_ranked',
      serpSummary,
    }),
    debug,
  )
}

function buildTransportDebug(args: {
  keyword: string
  targetDomain: string
  normalizedHostname: string
  dataForSeoTarget: string
  locationCode: number
  locationLabel: string
  languageCode: string
  device: string
  os: string
  depth: number
  httpStatus: number | null
  rankingStatus: RankingCheckStatus
  durationMs: number
}): RankingCheckDebugMeta {
  return {
    keyword: args.keyword,
    siteDomain: args.targetDomain,
    normalizedHostname: args.normalizedHostname,
    dataForSeoTarget: args.dataForSeoTarget,
    requestedLocationCode: args.locationCode,
    resolvedLocationCode: args.locationCode,
    resolvedLocationLabel: args.locationLabel,
    languageCode: args.languageCode,
    device: args.device,
    os: args.os,
    requestedDepth: args.depth,
    httpStatus: args.httpStatus,
    dataForSeoStatusCode: null,
    taskStatusCode: null,
    totalItems: 0,
    organicItems: 0,
    matchingOrganicCount: 0,
    domainMatches: [],
    selectedRank: null,
    selectedUrl: null,
    rankingStatus: args.rankingStatus,
    durationMs: args.durationMs,
    seResultsCount: null,
    itemsCount: null,
  }
}

/** Build Live Advanced task body. Production must omit `target` unless useApiTargetFilter is true. */
export function buildSerpLiveTaskBody(args: {
  keyword: string
  locationCode: number
  languageCode: string
  device: string
  os: string
  depth: number
  dataForSeoTarget?: string
  useApiTargetFilter?: boolean
}): Record<string, unknown>[] {
  const useTarget = args.useApiTargetFilter === true && !!args.dataForSeoTarget
  return [
    {
      keyword: args.keyword,
      ...(useTarget ? { target: args.dataForSeoTarget } : {}),
      location_code: args.locationCode,
      language_code: args.languageCode,
      device: args.device,
      os: args.os,
      depth: args.depth,
    },
  ]
}

/** Fetch SERP for one keyword and target domain; return best organic ranking for that domain. */
export async function fetchSerpRank(
  credentials: { login: string; password: string },
  keyword: string,
  targetDomain: string,
  options?: FetchSerpRankOptions,
): Promise<SerpRankResult> {
  const started = Date.now()
  const normalizedKeyword = normalizeTrackedKeyword(keyword) ?? keyword.trim()
  const normalizedHostname = normalizeRankingHostname(targetDomain)
  const includeSubdomains = options?.includeSubdomains !== false
  // Production default: full SERP (no target). Diagnose may opt into useApiTargetFilter.
  const useApiTargetFilter = options?.useApiTargetFilter === true
  const dataForSeoTarget = buildDataForSeoTarget(normalizedHostname || targetDomain, { includeSubdomains })
  const locationCode = options?.locationCode ?? RANK_TRACKING_DEFAULT_LOCATION_CODE
  const locationLabel = options?.locationLabel ?? RANK_TRACKING_DEFAULT_LOCATION_NAME
  const languageCode = options?.languageCode ?? RANK_TRACKING_DEFAULT_LANGUAGE_CODE
  const device = options?.device ?? RANK_TRACKING_DEFAULT_DEVICE
  const os = options?.os ?? defaultOsForDevice(device)
  const depth = options?.depth ?? RANK_TRACKING_SERP_DEPTH
  const fetchedAt = new Date().toISOString()

  const body = buildSerpLiveTaskBody({
    keyword: normalizedKeyword,
    locationCode,
    languageCode,
    device,
    os,
    depth,
    dataForSeoTarget,
    useApiTargetFilter,
  })

  const auth = Buffer.from(`${credentials.login}:${credentials.password}`).toString('base64')
  let httpStatus: number | null = null
  let data: SerpResponse | null = null

  const attachMeta = (result: SerpRankResult, meta: RankingCheckDebugMeta): SerpRankResult => {
    logRankingCheck(meta)
    if (options?.includeDebug) result.debug = meta
    return result
  }

  try {
    const res = await fetch(SERP_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    httpStatus = res.status
    try {
      data = (await res.json()) as SerpResponse
    } catch {
      const durationMs = Date.now() - started
      return attachMeta(
        emptyResult({
          domain: normalizedHostname,
          fetchedAt,
          rankingStatus: 'parsing_error',
          errorType: 'parsing',
          error: `Invalid JSON from DataForSEO (HTTP ${res.status})`,
        }),
        buildTransportDebug({
          keyword: normalizedKeyword,
          targetDomain,
          normalizedHostname,
          dataForSeoTarget,
          locationCode,
          locationLabel,
          languageCode,
          device,
          os,
          depth,
          httpStatus,
          rankingStatus: 'parsing_error',
          durationMs,
        }),
      )
    }

    if (!res.ok && (!data || data.status_code == null)) {
      const durationMs = Date.now() - started
      return attachMeta(
        emptyResult({
          domain: normalizedHostname,
          fetchedAt,
          rankingStatus: 'api_error',
          errorType: 'api',
          error: `HTTP ${res.status} from DataForSEO`,
          rawDebug: options?.requestRawDebug ? sanitizeRawForDebug(data) : undefined,
        }),
        buildTransportDebug({
          keyword: normalizedKeyword,
          targetDomain,
          normalizedHostname,
          dataForSeoTarget,
          locationCode,
          locationLabel,
          languageCode,
          device,
          os,
          depth,
          httpStatus,
          rankingStatus: 'api_error',
          durationMs,
        }),
      )
    }
  } catch (e) {
    const durationMs = Date.now() - started
    const msg = e instanceof Error ? e.message : String(e)
    return attachMeta(
      emptyResult({
        domain: normalizedHostname,
        fetchedAt,
        rankingStatus: 'api_error',
        errorType: 'api',
        error: msg,
      }),
      buildTransportDebug({
        keyword: normalizedKeyword,
        targetDomain,
        normalizedHostname,
        dataForSeoTarget,
        locationCode,
        locationLabel,
        languageCode,
        device,
        os,
        depth,
        httpStatus,
        rankingStatus: 'api_error',
        durationMs,
      }),
    )
  }

  return parseSerpRankResponse(data, {
    keyword: normalizedKeyword,
    targetDomain,
    normalizedHostname,
    dataForSeoTarget,
    locationCode,
    locationLabel,
    languageCode,
    device,
    os,
    depth,
    includeSubdomains,
    usedApiTargetFilter: useApiTargetFilter && !!dataForSeoTarget,
    fetchedAt,
    httpStatus,
    durationMs: Date.now() - started,
    includeDebug: options?.includeDebug,
    requestRawDebug: options?.requestRawDebug,
  })
}

/**
 * Diagnostic helper: run one keyword check and return a structured comparison-friendly payload.
 * Does not write to PocketBase.
 */
export async function diagnoseKeywordRanking(args: {
  credentials: { login: string; password: string }
  domain: string
  keyword: string
  locationCode?: number
  locationLabel?: string
  languageCode?: string
  device?: 'desktop' | 'mobile'
  os?: string
  depth?: number
  includeSubdomains?: boolean
  /** When true, include sanitized raw SERP slice. */
  includeRaw?: boolean
  /** Diagnose-only: also send DataForSEO target filter for comparison. */
  useTarget?: boolean
}): Promise<{
  keyword: string
  domain: string
  normalizedDomain: string
  dataForSeoTarget: string
  usedApiTargetFilter: boolean
  requestedDepth: number
  location: { code: number; label: string }
  language: string
  device: string
  apiStatus: RankingCheckStatus
  totalItems: number
  organicItems: number
  domainMatches: Array<{ position: number; url: string; title?: string }>
  selectedRank: number | null
  selectedUrl: string | null
  serpFeatureTypes?: string[]
  durationMs: number
  error?: string
  raw?: unknown
}> {
  const result = await fetchSerpRank(args.credentials, args.keyword, args.domain, {
    locationCode: args.locationCode,
    locationLabel: args.locationLabel,
    languageCode: args.languageCode,
    device: args.device,
    os: args.os,
    depth: args.depth,
    includeSubdomains: args.includeSubdomains,
    includeDebug: true,
    requestRawDebug: !!args.includeRaw,
    useApiTargetFilter: args.useTarget === true,
  })
  const debug = result.debug!
  return {
    keyword: debug.keyword,
    domain: args.domain,
    normalizedDomain: debug.normalizedHostname,
    dataForSeoTarget: debug.dataForSeoTarget,
    usedApiTargetFilter: args.useTarget === true,
    requestedDepth: debug.requestedDepth,
    location: { code: debug.resolvedLocationCode, label: debug.resolvedLocationLabel },
    language: debug.languageCode,
    device: debug.device,
    apiStatus: result.rankingStatus,
    totalItems: debug.totalItems,
    organicItems: debug.organicItems,
    domainMatches: debug.domainMatches,
    selectedRank: debug.selectedRank,
    selectedUrl: debug.selectedUrl,
    serpFeatureTypes: result.serpSummary?.serpFeatureTypes,
    durationMs: debug.durationMs,
    error: result.error,
    raw: args.includeRaw ? result.rawDebug : undefined,
  }
}

interface SearchVolumeTaskResult {
  keyword?: string
  search_volume?: number | null
}

interface SearchVolumeResponse {
  status_code?: number
  status_message?: string
  tasks?: Array<{
    id?: string
    status_code?: number
    status_message?: string
    result?: SearchVolumeTaskResult[]
  }>
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Monthly search volumes (Google Ads / Planner-style) for up to 1000 keywords.
 * Uses the Live endpoint so volumes resolve in one request (task_post+poll often
 * timed out before results were ready, leaving UI dashes).
 * Keys in the returned map are lowercase trimmed keywords ({@link keywordDedupeKey}).
 * Always default to US/en — city ranking location must not drive volume.
 */
export async function fetchGoogleAdsSearchVolumes(
  credentials: { login: string; password: string },
  keywords: string[],
  options?: { locationCode?: number; languageCode?: string },
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  const eligible = keywords
    .map((k) => normalizeTrackedKeyword(k) ?? '')
    .filter((k) => k.length > 0 && k.length <= DATAFORSEO_SEARCH_VOLUME_MAX_KEYWORD_LEN)
  if (!eligible.length) return map

  // Product: Volume (US) column — ignore city SERP context for Planner volumes.
  const locationCode = options?.locationCode ?? RANK_TRACKING_DEFAULT_LOCATION_CODE
  const languageCode = options?.languageCode ?? RANK_TRACKING_DEFAULT_LANGUAGE_CODE

  const body = [
    {
      location_code: locationCode,
      language_code: languageCode,
      search_partners: false,
      keywords: eligible,
    },
  ]

  const auth = Buffer.from(`${credentials.login}:${credentials.password}`).toString('base64')
  let liveData: SearchVolumeResponse
  try {
    const liveRes = await fetch(SEARCH_VOLUME_LIVE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    liveData = (await liveRes.json()) as SearchVolumeResponse
  } catch {
    return map
  }

  if (liveData.status_code !== 20000) return map
  const task = liveData.tasks?.[0]
  if (!task || task.status_code !== 20000) return map

  for (const row of task.result ?? []) {
    const k = typeof row.keyword === 'string' ? keywordDedupeKey(row.keyword) : ''
    if (!k) continue
    const sv = row.search_volume
    if (typeof sv === 'number' && !Number.isNaN(sv) && sv >= 0) map.set(k, sv)
  }
  return map
}

/**
 * Persist US monthly volumes onto rank_keyword rows that are missing `search_volume`.
 * Mutates `rows` in place when updates succeed so callers can return fresh list data.
 */
export async function backfillMissingRankKeywordVolumes(
  pb: PocketBase,
  credentials: { login: string; password: string },
  rows: Array<{ id: string; keyword: string; search_volume?: number | null }>,
): Promise<number> {
  const missing = rows.filter((r) => typeof r.search_volume !== 'number' || Number.isNaN(r.search_volume))
  if (!missing.length) return 0

  const volumes = await fetchGoogleAdsSearchVolumesChunked(
    credentials,
    missing.map((r) => r.keyword),
    {
      locationCode: RANK_TRACKING_DEFAULT_LOCATION_CODE,
      languageCode: RANK_TRACKING_DEFAULT_LANGUAGE_CODE,
    },
  )
  if (!volumes.size) return 0

  let updated = 0
  for (const row of missing) {
    const key = keywordDedupeKey(normalizeTrackedKeyword(row.keyword) ?? row.keyword)
    if (!volumes.has(key)) continue
    const search_volume = volumes.get(key)!
    try {
      await pb.collection('rank_keywords').update(row.id, { search_volume })
      row.search_volume = search_volume
      updated += 1
    } catch {
      // schema / permission — leave dash
    }
  }
  return updated
}

/**
 * Same as {@link fetchGoogleAdsSearchVolumes} but chunks keywords (max 1000 per task)
 * and spaces Live submissions to respect ~12 rpm Live rate limits.
 */
export async function fetchGoogleAdsSearchVolumesChunked(
  credentials: { login: string; password: string },
  keywords: string[],
  options?: { locationCode?: number; languageCode?: string },
): Promise<Map<string, number>> {
  const merged = new Map<string, number>()
  const eligible = keywords
    .map((k) => normalizeTrackedKeyword(k) ?? '')
    .filter((k) => k.length > 0 && k.length <= DATAFORSEO_SEARCH_VOLUME_MAX_KEYWORD_LEN)
  for (let i = 0; i < eligible.length; i += SEARCH_VOLUME_CHUNK) {
    if (i > 0) {
      await sleep(SEARCH_VOLUME_CHUNK_DELAY_MS)
    }
    const slice = eligible.slice(i, i + SEARCH_VOLUME_CHUNK)
    const part = await fetchGoogleAdsSearchVolumes(credentials, slice, options)
    for (const [k, v] of part) merged.set(k, v)
  }
  return merged
}
