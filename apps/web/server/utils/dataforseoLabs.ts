/**
 * DataForSEO Labs API — ranked keywords for a domain (keyword research by domain).
 * Uses the same app_settings credentials as SERP / keyword volume.
 * Requires DataForSEO Labs subscription (separate from SERP-only usage).
 */

import { normalizeTargetDomain } from '~/server/utils/dataforseo'

const RANKED_KEYWORDS_URL = 'https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live'

export interface DomainRankedKeyword {
  keyword: string
  position: number
  searchVolume: number | null
  url: string
}

export interface DomainRankedKeywordsResult {
  targetDomain: string
  totalCount: number
  keywords: DomainRankedKeyword[]
  error?: string
}

interface DfsEnvelope {
  status_code?: number
  status_message?: string
  tasks?: Array<{
    status_code?: number
    status_message?: string
    result?: Array<{
      total_count?: number
      items?: Array<{
        keyword_data?: {
          keyword?: string
          keyword_info?: { search_volume?: number | null }
        }
        ranked_serp_element?: {
          serp_item?: {
            type?: string
            rank_group?: number
            url?: string
          }
        }
      }>
    }>
  }>
}

function basicAuthHeader(login: string, password: string): string {
  return `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`
}

function labsSubscriptionHint(message: string): string | null {
  const lower = message.toLowerCase()
  if (
    lower.includes('labs') && (lower.includes('subscription') || lower.includes('not active') || lower.includes('access'))
  ) {
    return 'DataForSEO Labs is not enabled on your account. Keyword research by domain uses the Labs Ranked Keywords API — enable Labs in your DataForSEO account (same API login as Admin → Integrations).'
  }
  if (lower.includes('insufficient') && lower.includes('balance')) {
    return 'DataForSEO account balance is too low for this Labs request.'
  }
  return null
}

/** Keywords a domain ranks for (organic, US/en by default). */
export async function fetchDomainRankedKeywords(
  credentials: { login: string; password: string },
  targetDomain: string,
  options?: { locationCode?: number; languageCode?: string; limit?: number },
): Promise<DomainRankedKeywordsResult> {
  const target = normalizeTargetDomain(targetDomain)
  const locationCode = options?.locationCode ?? 2840
  const languageCode = options?.languageCode ?? 'en'
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 1000)

  const body = [
    {
      target,
      location_code: locationCode,
      language_code: languageCode,
      limit,
      item_types: ['organic'],
      filters: [
        ['ranked_serp_element.serp_item.type', '=', 'organic'],
      ],
      order_by: ['keyword_data.keyword_info.search_volume,desc'],
    },
  ]

  const res = await fetch(RANKED_KEYWORDS_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(credentials.login, credentials.password),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  let data: DfsEnvelope
  try {
    data = (await res.json()) as DfsEnvelope
  } catch {
    return { targetDomain: target, totalCount: 0, keywords: [], error: `Invalid JSON (HTTP ${res.status})` }
  }

  if (data.status_code !== 20000) {
    const msg = data.status_message ?? `API status ${data.status_code}`
    return {
      targetDomain: target,
      totalCount: 0,
      keywords: [],
      error: labsSubscriptionHint(msg) ?? msg,
    }
  }

  const task = data.tasks?.[0]
  if (!task || task.status_code !== 20000) {
    const msg = task?.status_message ?? 'Labs ranked keywords task failed'
    return {
      targetDomain: target,
      totalCount: 0,
      keywords: [],
      error: labsSubscriptionHint(msg) ?? msg,
    }
  }

  const resultBlock = task.result?.[0]
  const totalCount = typeof resultBlock?.total_count === 'number' ? resultBlock.total_count : 0
  const items = resultBlock?.items ?? []

  const seen = new Set<string>()
  const keywords: DomainRankedKeyword[] = []
  for (const item of items) {
    const keyword = (item.keyword_data?.keyword || '').trim()
    if (!keyword) continue
    const normalized = keyword.toLowerCase()
    if (seen.has(normalized)) continue
    seen.add(normalized)

    const serpItem = item.ranked_serp_element?.serp_item
    if (serpItem?.type && serpItem.type !== 'organic') continue

    const position = typeof serpItem?.rank_group === 'number' ? serpItem.rank_group : 0
    const sv = item.keyword_data?.keyword_info?.search_volume
    const searchVolume = typeof sv === 'number' && !Number.isNaN(sv) ? sv : null

    keywords.push({
      keyword,
      position,
      searchVolume,
      url: (serpItem?.url || '').trim(),
    })
  }

  return { targetDomain: target, totalCount, keywords }
}
