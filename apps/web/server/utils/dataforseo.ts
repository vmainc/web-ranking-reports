/**
 * DataForSEO Google Organic SERP API (v3) for rank tracking.
 * Uses Live Advanced endpoint with target filter for the site domain.
 *
 * Keyword monthly volumes: Keywords Data API → Google Ads → search_volume task POST+GET.
 * This is slower than the Live endpoint but generally lower cost.
 */

import type PocketBase from 'pocketbase'

const SERP_URL = 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced'
const MAX_KEYWORDS_PER_REQUEST = 1 // API allows 1 task per request for this endpoint

const SEARCH_VOLUME_TASK_POST_URL = 'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/task_post'
const SEARCH_VOLUME_TASK_GET_BASE_URL = 'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/task_get'
/** DataForSEO limit per keyword for Google Ads search volume tasks */
const DATAFORSEO_SEARCH_VOLUME_MAX_KEYWORD_LEN = 80
/** Standard Google Ads search volume: max keywords per task (DataForSEO docs). */
const SEARCH_VOLUME_CHUNK = 1000
/** Spread multiple task submissions slightly to avoid burst limits. */
const SEARCH_VOLUME_CHUNK_DELAY_MS = 500
/** Poll intervals for async task_get (lower-cost endpoint can take a bit). */
const SEARCH_VOLUME_POLL_DELAYS_MS = [2000, 3000, 5000]
/** Reuse in-flight task ids briefly so repeated UI refreshes do not post duplicate tasks. */
const SEARCH_VOLUME_TASK_TTL_MS = 30 * 60 * 1000
const SEARCH_VOLUME_PENDING_TASKS = new Map<string, { taskId: string; createdAtMs: number }>()

export interface SerpRankResult {
  position: number
  rankAbsolute: number
  url: string
  title: string
  description: string | null
  domain: string
  fetchedAt: string
  error?: string
  /**
   * Classifies a failed fetch:
   * - `api`: DataForSEO/transport failure (rate limit, auth, outage, bad response). The site
   *   may still rank — callers should NOT treat this as a lost ranking or overwrite good data.
   * - `not_ranked`: request succeeded but the domain was not in the tracked SERP window (a real
   *   "no ranking" result, position 0).
   */
  errorType?: 'api' | 'not_ranked'
}

/** Normalize domain for DataForSEO target: no protocol, no www. */
export function normalizeTargetDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '')
    .trim() || domain
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

/** Single task request/response types from DataForSEO. */
interface SerpTask {
  keyword: string
  target?: string
  location_code?: number
  language_code?: string
  depth?: number
}

interface SerpOrganicItem {
  type: string
  rank_group?: number
  rank_absolute?: number
  domain?: string
  url?: string
  title?: string
  description?: string
}

/** One result block in task.result[] - has items[] at this level (DataForSEO response shape). */
interface SerpTaskResult {
  keyword?: string
  items?: SerpOrganicItem[]
  status_code?: number
  status_message?: string
}

interface SerpResponse {
  status_code?: number
  tasks?: Array<{
    status_code?: number
    status_message?: string
    result?: SerpTaskResult[]
  }>
}

/** Fetch SERP for one keyword and target domain; return best (top) ranking for that domain. */
export async function fetchSerpRank(
  credentials: { login: string; password: string },
  keyword: string,
  targetDomain: string,
  options?: { locationCode?: number; languageCode?: string }
): Promise<SerpRankResult> {
  const target = normalizeTargetDomain(targetDomain)
  const locationCode = options?.locationCode ?? 2840 // United States
  const languageCode = options?.languageCode ?? 'en'

  const body: SerpTask[] = [
    {
      keyword,
      target,
      location_code: locationCode,
      language_code: languageCode,
      depth: 100, // get more results to find our domain if it's lower
    },
  ]

  const auth = Buffer.from(`${credentials.login}:${credentials.password}`).toString('base64')
  const res = await fetch(SERP_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = (await res.json()) as SerpResponse
  const fetchedAt = new Date().toISOString()

  if (data.status_code !== 20000 || !data.tasks?.length) {
    const msg = (data as { status_message?: string }).status_message ?? `HTTP ${res.status}`
    return {
      position: 0,
      rankAbsolute: 0,
      url: '',
      title: '',
      description: null,
      domain: target,
      fetchedAt,
      error: msg,
      errorType: 'api',
    }
  }

  const task = data.tasks[0]
  const firstResult = task?.result?.[0]
  const items = firstResult?.items ?? []
  if (task?.status_code !== 20000) {
    const msg = firstResult?.status_message ?? task?.status_message ?? 'No results'
    return {
      position: 0,
      rankAbsolute: 0,
      url: '',
      title: '',
      description: null,
      domain: target,
      fetchedAt,
      error: msg,
      errorType: 'api',
    }
  }
  if (items.length === 0) {
    // Task succeeded but the domain is not present in the tracked SERP window.
    const msg = firstResult?.status_message ?? task?.status_message ?? 'Not found in top results'
    return {
      position: 0,
      rankAbsolute: 0,
      url: '',
      title: '',
      description: null,
      domain: target,
      fetchedAt,
      error: msg,
      errorType: 'not_ranked',
    }
  }

  // With target= our domain, API returns only our domain's results. Take the first (best) one.
  const organic = items.find((i) => i.type === 'organic') as SerpOrganicItem | undefined
  if (!organic) {
    return {
      position: 0,
      rankAbsolute: 0,
      url: '',
      title: '',
      description: null,
      domain: target,
      fetchedAt,
      error: 'Not found in top results',
      errorType: 'not_ranked',
    }
  }

  return {
    position: organic.rank_group ?? 0,
    rankAbsolute: organic.rank_absolute ?? 0,
    url: organic.url ?? '',
    title: organic.title ?? '',
    description: organic.description ?? null,
    domain: organic.domain ?? target,
    fetchedAt,
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
 * Monthly search volumes (Google Ads / Planner-style) for up to 1000 keywords per task.
 * Uses low-cost task POST+GET flow (async); returns empty map if results are not ready yet.
 * Keys in the returned map are lowercase trimmed keywords.
 */
export async function fetchGoogleAdsSearchVolumes(
  credentials: { login: string; password: string },
  keywords: string[],
  options?: { locationCode?: number; languageCode?: string }
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  const eligible = keywords
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && k.length <= DATAFORSEO_SEARCH_VOLUME_MAX_KEYWORD_LEN)
  if (!eligible.length) return map

  const locationCode = options?.locationCode ?? 2840
  const languageCode = options?.languageCode ?? 'en'

  const body = [
    {
      location_code: locationCode,
      language_code: languageCode,
      search_partners: false,
      keywords: eligible,
    },
  ]

  const auth = Buffer.from(`${credentials.login}:${credentials.password}`).toString('base64')
  const keySeed = eligible.map((k) => k.toLowerCase()).sort().join('\n')
  const taskCacheKey = `${locationCode}:${languageCode}:${keySeed}`
  let taskId = ''
  const cached = SEARCH_VOLUME_PENDING_TASKS.get(taskCacheKey)
  if (cached && Date.now() - cached.createdAtMs < SEARCH_VOLUME_TASK_TTL_MS) {
    taskId = cached.taskId
  } else {
    if (cached) SEARCH_VOLUME_PENDING_TASKS.delete(taskCacheKey)
    const postRes = await fetch(SEARCH_VOLUME_TASK_POST_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    let postData: SearchVolumeResponse
    try {
      postData = (await postRes.json()) as SearchVolumeResponse
    } catch {
      return map
    }

    if (postData.status_code !== 20000) return map
    taskId = postData.tasks?.[0]?.id ?? ''
    if (!taskId) return map
    SEARCH_VOLUME_PENDING_TASKS.set(taskCacheKey, { taskId, createdAtMs: Date.now() })
  }
  if (!taskId) return map

  for (let attempt = 0; attempt <= SEARCH_VOLUME_POLL_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) {
      await sleep(SEARCH_VOLUME_POLL_DELAYS_MS[attempt - 1]!)
    }
    const getRes = await fetch(`${SEARCH_VOLUME_TASK_GET_BASE_URL}/${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    })
    let getData: SearchVolumeResponse
    try {
      getData = (await getRes.json()) as SearchVolumeResponse
    } catch {
      continue
    }
    if (getData.status_code !== 20000) continue
    const task = getData.tasks?.[0]
    if (!task) continue
    if (task.status_code !== 20000) {
      // Not ready yet (or no data). Keep polling until we run out of attempts.
      continue
    }
    SEARCH_VOLUME_PENDING_TASKS.delete(taskCacheKey)
    for (const row of task.result ?? []) {
      const k = typeof row.keyword === 'string' ? row.keyword.trim().toLowerCase() : ''
      if (!k) continue
      const sv = row.search_volume
      if (typeof sv === 'number' && !Number.isNaN(sv) && sv >= 0) map.set(k, sv)
    }
    if (map.size > 0) break
  }
  return map
}

/**
 * Same as {@link fetchGoogleAdsSearchVolumes} but chunks keywords (max 1000 per task)
 * and spaces task submissions slightly to avoid burst rate limits.
 */
export async function fetchGoogleAdsSearchVolumesChunked(
  credentials: { login: string; password: string },
  keywords: string[],
  options?: { locationCode?: number; languageCode?: string },
): Promise<Map<string, number>> {
  const merged = new Map<string, number>()
  const eligible = keywords
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && k.length <= DATAFORSEO_SEARCH_VOLUME_MAX_KEYWORD_LEN)
  for (let i = 0; i < eligible.length; i += SEARCH_VOLUME_CHUNK) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, SEARCH_VOLUME_CHUNK_DELAY_MS))
    }
    const slice = eligible.slice(i, i + SEARCH_VOLUME_CHUNK)
    const part = await fetchGoogleAdsSearchVolumes(credentials, slice, options)
    for (const [k, v] of part) merged.set(k, v)
  }
  return merged
}
