/**
 * DataForSEO Google Organic SERP API (v3) for rank tracking.
 * Uses Live Advanced endpoint with target filter for the site domain.
 */

import type PocketBase from 'pocketbase'

const SERP_URL = 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced'
const MAX_KEYWORDS_PER_REQUEST = 1 // API allows 1 task per request for this endpoint

export interface SerpRankResult {
  position: number
  rankAbsolute: number
  url: string
  title: string
  description: string | null
  domain: string
  fetchedAt: string
  error?: string
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

interface SerpTaskResult {
  keyword?: string
  result?: Array<{
    items?: SerpOrganicItem[]
  }>
  status_code?: number
  status_message?: string
}

interface SerpResponse {
  status_code?: number
  tasks?: Array<{
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
    }
  }

  const task = data.tasks[0]
  const firstResult = task?.result?.[0]
  if (task?.status_code !== 20000 || !firstResult?.result?.items) {
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
    }
  }

  // With target= our domain, API returns only our domain's results. Take the first (best) one.
  const organic = firstResult.result.items.find((i) => i.type === 'organic') as SerpOrganicItem | undefined
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
