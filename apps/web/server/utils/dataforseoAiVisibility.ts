/**
 * DataForSEO LLM Mentions — target metrics (AI visibility / GEO).
 * Uses the same app_settings credentials as SERP rank tracking.
 *
 * Domain KPIs = mentions of the site domain in AI answers.
 * Keyword rows = mentions of the site domain in AI answers about that keyword
 * (domain + keyword targets combined — not market-wide keyword volume).
 *
 * @see https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/target_metrics/live/
 */

import { normalizeTargetDomain } from '~/server/utils/dataforseo'
import type { AiVisibilityKeywordRow, AiVisibilityPlatformMetrics, AiVisibilityProfile } from '~/types/aiVisibility'

const TARGET_METRICS_URL = 'https://api.dataforseo.com/v3/ai_optimization/llm_mentions/target_metrics/live'

const DEFAULT_LOCATION_CODE = 2840
const DEFAULT_LANGUAGE_CODE = 'en'
const MAX_KEYWORDS_PER_FETCH = 5

function basicAuthHeader(login: string, password: string): string {
  return `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`
}

interface DfsEnvelope {
  status_code?: number
  status_message?: string
  tasks?: Array<{
    status_code?: number
    status_message?: string
    cost?: number
    result?: Array<Record<string, unknown>>
  }>
}

type GroupRow = { key?: string | number; mentions?: number; ai_search_volume?: number }

function taskError(env: DfsEnvelope): string | null {
  if (env.status_code != null && env.status_code !== 20000) {
    return env.status_message ?? `API status ${env.status_code}`
  }
  const t = env.tasks?.[0]
  if (t?.status_code != null && t.status_code !== 20000) {
    return t.status_message ?? `Task status ${t.status_code}`
  }
  return null
}

async function dfsPost(url: string, credentials: { login: string; password: string }, body: unknown[]): Promise<DfsEnvelope> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(credentials.login, credentials.password),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  try {
    return (await res.json()) as DfsEnvelope
  } catch {
    return { status_message: `Invalid JSON (HTTP ${res.status})` }
  }
}

function readMetrics(row: GroupRow | null | undefined): AiVisibilityPlatformMetrics | null {
  if (!row) return null
  const mentions = typeof row.mentions === 'number' ? row.mentions : 0
  const aiSearchVolume = typeof row.ai_search_volume === 'number' ? row.ai_search_volume : 0
  return { mentions, aiSearchVolume }
}

function parseTargetMetrics(env: DfsEnvelope): {
  cost: number
  total: AiVisibilityPlatformMetrics
  google: AiVisibilityPlatformMetrics | null
  chatGpt: AiVisibilityPlatformMetrics | null
  topSourceDomains: Array<{ domain: string; mentions: number; aiSearchVolume: number }>
  error: string | null
} {
  const err = taskError(env)
  const cost = env.tasks?.[0]?.cost ?? 0
  const resultRow = env.tasks?.[0]?.result?.[0]
  if (!resultRow || err) {
    return {
      cost,
      total: { mentions: 0, aiSearchVolume: 0 },
      google: null,
      chatGpt: null,
      topSourceDomains: [],
      error: err ?? 'Empty LLM Mentions response',
    }
  }

  const agg = (resultRow.aggregated_metrics ?? resultRow.total) as Record<string, unknown> | undefined
  const totalObj = (agg?.total ?? resultRow.total) as GroupRow | undefined
  const platformRows = (agg?.platform ?? []) as GroupRow[]
  const googleRow = platformRows.find((p) => String(p.key) === 'google')
  const chatGptRow = platformRows.find((p) => String(p.key) === 'chat_gpt')
  const sources = ((agg?.sources_domain ?? []) as GroupRow[]).slice(0, 10)

  return {
    cost,
    total: readMetrics(totalObj) ?? { mentions: 0, aiSearchVolume: 0 },
    google: readMetrics(googleRow),
    chatGpt: readMetrics(chatGptRow),
    topSourceDomains: sources
      .filter((s) => s.key != null && String(s.key).trim())
      .map((s) => ({
        domain: String(s.key),
        mentions: s.mentions ?? 0,
        aiSearchVolume: s.ai_search_volume ?? 0,
      })),
    error: null,
  }
}

async function fetchTargetMetrics(
  credentials: { login: string; password: string },
  target: Array<Record<string, unknown>>,
  tag: string,
): Promise<ReturnType<typeof parseTargetMetrics>> {
  const body = [
    {
      language_code: DEFAULT_LANGUAGE_CODE,
      location_code: DEFAULT_LOCATION_CODE,
      target,
      internal_list_limit: 10,
      tag,
    },
  ]
  const env = await dfsPost(TARGET_METRICS_URL, credentials, body)
  return parseTargetMetrics(env)
}

/** Domain-only target: how often AI answers mention this site. */
export function domainTargetEntities(domain: string): Array<Record<string, unknown>> {
  return [{ domain, search_filter: 'include', include_subdomains: true }]
}

/**
 * Brand + keyword target: how often AI answers about this keyword mention the site.
 * Keyword-only targets return market-wide keyword volume and must not be shown as brand mentions.
 */
export function brandKeywordTargetEntities(domain: string, keyword: string): Array<Record<string, unknown>> {
  return [
    { domain, search_filter: 'include', include_subdomains: true },
    { keyword, search_filter: 'include', search_scope: ['any'], match_type: 'word_match' },
  ]
}

export async function fetchAiVisibilityProfile(
  credentials: { login: string; password: string },
  domainInput: string,
  keywordInputs: string[] = [],
): Promise<AiVisibilityProfile> {
  const target = normalizeTargetDomain(domainInput)
  const keywords = keywordInputs
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, MAX_KEYWORDS_PER_FETCH)

  const costs: Record<string, number> = {}
  const errors: Record<string, string> = {}

  const domainResult = await fetchTargetMetrics(credentials, domainTargetEntities(target), 'domain')
  costs.domain = domainResult.cost
  if (domainResult.error) errors.domain = domainResult.error

  const keywordRows: AiVisibilityKeywordRow[] = []
  for (const keyword of keywords) {
    const kwResult = await fetchTargetMetrics(
      credentials,
      brandKeywordTargetEntities(target, keyword),
      `kw:${keyword.slice(0, 40)}`,
    )
    costs[`keyword:${keyword}`] = kwResult.cost
    if (kwResult.error) errors[`keyword:${keyword}`] = kwResult.error
    keywordRows.push({
      keyword,
      total: kwResult.total,
      google: kwResult.google,
      chatGpt: kwResult.chatGpt,
    })
  }

  return {
    target,
    fetchedAt: new Date().toISOString(),
    costs,
    ...(Object.keys(errors).length ? { errors } : {}),
    domain: {
      total: domainResult.total,
      google: domainResult.google,
      chatGpt: domainResult.chatGpt,
      topSourceDomains: domainResult.topSourceDomains,
    },
    keywords: keywordRows,
  }
}

export { MAX_KEYWORDS_PER_FETCH }
