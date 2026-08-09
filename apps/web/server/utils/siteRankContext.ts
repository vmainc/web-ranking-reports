/**
 * Canonical site rank-tracking context and ranking-series identity.
 * All fetch paths (cron, keyword add, manual, location change, diagnose) must use this.
 */

export type RankTrackingDevice = 'desktop' | 'mobile'
export type RankTrackingSearchEngine = 'google'

export const RANK_TRACKING_DEFAULT_LOCATION_CODE = 2840
export const RANK_TRACKING_DEFAULT_LOCATION_NAME = 'United States'
export const RANK_TRACKING_DEFAULT_LANGUAGE_CODE = 'en'
export const RANK_TRACKING_DEFAULT_DEVICE: RankTrackingDevice = 'desktop'
export const RANK_TRACKING_DEFAULT_OS = 'windows'
export const RANK_TRACKING_DEFAULT_SEARCH_ENGINE: RankTrackingSearchEngine = 'google'

export interface SiteRankTrackingConfig {
  location_code: number
  location_name: string
  location_type?: string
  country_iso?: string
  language_code: string
  device: RankTrackingDevice
  os?: string
  include_subdomains: boolean
  search_engine: RankTrackingSearchEngine
}

/** Resolved runtime context used for every SERP check. */
export interface SiteRankContext {
  locationCode: number
  locationName: string
  locationType?: string
  countryIso?: string
  languageCode: string
  device: RankTrackingDevice
  os: string
  includeSubdomains: boolean
  searchEngine: RankTrackingSearchEngine
}

/** Fields that define a ranking series (movement / charts / history). */
export interface RankingIdentity {
  locationCode: number
  languageCode: string
  device: RankTrackingDevice
  searchEngine: RankTrackingSearchEngine
}

export const DEFAULT_SITE_RANK_TRACKING_CONFIG: SiteRankTrackingConfig = {
  location_code: RANK_TRACKING_DEFAULT_LOCATION_CODE,
  location_name: RANK_TRACKING_DEFAULT_LOCATION_NAME,
  location_type: 'Country',
  country_iso: 'US',
  language_code: RANK_TRACKING_DEFAULT_LANGUAGE_CODE,
  device: RANK_TRACKING_DEFAULT_DEVICE,
  os: RANK_TRACKING_DEFAULT_OS,
  include_subdomains: true,
  search_engine: RANK_TRACKING_DEFAULT_SEARCH_ENGINE,
}

function defaultOsForDevice(device: RankTrackingDevice): string {
  return device === 'mobile' ? 'android' : RANK_TRACKING_DEFAULT_OS
}

export { defaultOsForDevice as defaultOsForRankDevice }

function asPositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value)
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const n = parseInt(value.trim(), 10)
    return n > 0 ? n : null
  }
  return null
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const s = value.trim()
  return s ? s : null
}

/** Normalize partial/legacy JSON into a full config object. */
export function normalizeSiteRankTrackingConfig(raw: unknown): SiteRankTrackingConfig {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const device: RankTrackingDevice = src.device === 'mobile' ? 'mobile' : 'desktop'
  const locationCode = asPositiveInt(src.location_code) ?? DEFAULT_SITE_RANK_TRACKING_CONFIG.location_code
  const locationName =
    asNonEmptyString(src.location_name) ??
    (locationCode === RANK_TRACKING_DEFAULT_LOCATION_CODE
      ? RANK_TRACKING_DEFAULT_LOCATION_NAME
      : `Location ${locationCode}`)

  return {
    location_code: locationCode,
    location_name: locationName,
    location_type: asNonEmptyString(src.location_type) ?? undefined,
    country_iso: asNonEmptyString(src.country_iso)?.toUpperCase() ?? undefined,
    language_code: (asNonEmptyString(src.language_code) ?? DEFAULT_SITE_RANK_TRACKING_CONFIG.language_code).toLowerCase(),
    device,
    os: asNonEmptyString(src.os) ?? defaultOsForDevice(device),
    include_subdomains: src.include_subdomains === false ? false : true,
    search_engine: 'google',
  }
}

export function siteRankConfigToContext(config: SiteRankTrackingConfig): SiteRankContext {
  const device = config.device === 'mobile' ? 'mobile' : 'desktop'
  return {
    locationCode: config.location_code,
    locationName: config.location_name,
    locationType: config.location_type,
    countryIso: config.country_iso,
    languageCode: config.language_code || 'en',
    device,
    os: config.os || defaultOsForDevice(device),
    includeSubdomains: config.include_subdomains !== false,
    searchEngine: 'google',
  }
}

/**
 * Resolve effective rank-tracking context for a site record.
 * Missing/empty config → US / en / desktop baseline.
 */
export function resolveSiteRankContext(site: {
  rank_tracking_config?: unknown
  [key: string]: unknown
} | null | undefined): SiteRankContext {
  const config = normalizeSiteRankTrackingConfig(site?.rank_tracking_config)
  return siteRankConfigToContext(config)
}

export function rankingIdentityFromContext(ctx: SiteRankContext): RankingIdentity {
  return {
    locationCode: ctx.locationCode,
    languageCode: ctx.languageCode,
    device: ctx.device,
    searchEngine: ctx.searchEngine,
  }
}

export function rankingIdentityKey(id: RankingIdentity): string {
  return [
    id.locationCode,
    (id.languageCode || 'en').toLowerCase(),
    id.device || 'desktop',
    id.searchEngine || 'google',
  ].join('|')
}

export function rankingIdentitiesEqual(
  a: RankingIdentity | null | undefined,
  b: RankingIdentity | null | undefined,
): boolean {
  if (!a || !b) return false
  return rankingIdentityKey(a) === rankingIdentityKey(b)
}

/** Extract identity from a stored last_result_json / snapshot row. */
export function extractRankingIdentity(row: {
  location_code?: unknown
  locationCode?: unknown
  language_code?: unknown
  languageCode?: unknown
  device?: unknown
  search_engine?: unknown
  searchEngine?: unknown
} | null | undefined): RankingIdentity | null {
  if (!row) return null
  const locationCode = asPositiveInt(row.location_code ?? row.locationCode)
  if (!locationCode) return null
  const languageCode = (asNonEmptyString(row.language_code ?? row.languageCode) ?? 'en').toLowerCase()
  const device: RankTrackingDevice = row.device === 'mobile' ? 'mobile' : 'desktop'
  const searchEngine: RankTrackingSearchEngine =
    row.search_engine === 'google' || row.searchEngine === 'google' || !row.search_engine
      ? 'google'
      : 'google'
  return { locationCode, languageCode, device, searchEngine }
}

/**
 * True when a stored result belongs to the site's current ranking series
 * and is not marked stale after a config change.
 */
export function isResultCurrentForContext(
  lastResult: {
    contextStale?: unknown
    location_code?: unknown
    locationCode?: unknown
    language_code?: unknown
    languageCode?: unknown
    device?: unknown
    search_engine?: unknown
    searchEngine?: unknown
    position?: unknown
    rankingStatus?: unknown
  } | null | undefined,
  ctx: SiteRankContext,
): boolean {
  if (!lastResult || lastResult.contextStale === true) return false
  const id = extractRankingIdentity(lastResult)
  if (!id) {
    // Legacy rows (pre-identity): treat as US desktop google if that is current context.
    const legacyMatchesDefault =
      ctx.locationCode === RANK_TRACKING_DEFAULT_LOCATION_CODE &&
      ctx.languageCode === 'en' &&
      ctx.device === 'desktop' &&
      ctx.searchEngine === 'google'
    return legacyMatchesDefault
  }
  return rankingIdentitiesEqual(id, rankingIdentityFromContext(ctx))
}

export function formatRankContextLabel(ctx: SiteRankContext): string {
  const loc = ctx.locationName || `Location ${ctx.locationCode}`
  const device = ctx.device === 'mobile' ? 'Mobile' : 'Desktop'
  return `${loc} · ${device} · Google Organic`
}

/** Fields stamped onto last_result_json / history for series identity. */
export function rankingContextPersistFields(ctx: SiteRankContext): Record<string, unknown> {
  return {
    location_code: ctx.locationCode,
    location_name: ctx.locationName,
    language_code: ctx.languageCode,
    device: ctx.device,
    os: ctx.os,
    search_engine: ctx.searchEngine,
    include_subdomains: ctx.includeSubdomains,
  }
}
