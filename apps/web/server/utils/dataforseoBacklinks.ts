/**
 * DataForSEO Backlinks API (v3) — summary, lists, and sample backlinks.
 * Uses the same app_settings credentials as SERP / keyword volume.
 */

import { normalizeTargetDomain } from '~/server/utils/dataforseo'

const BASE = 'https://api.dataforseo.com/v3/backlinks'

const URLS = {
  summary: `${BASE}/summary/live`,
  referringDomains: `${BASE}/referring_domains/live`,
  anchors: `${BASE}/anchors/live`,
  domainPages: `${BASE}/domain_pages/live`,
  backlinks: `${BASE}/backlinks/live`,
} as const

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

function firstResultRow(env: DfsEnvelope): Record<string, unknown> | null {
  const row = env.tasks?.[0]?.result?.[0]
  return row && typeof row === 'object' ? row : null
}

function firstResultItems<T extends Record<string, unknown>>(env: DfsEnvelope): T[] {
  const row = firstResultRow(env) as { items?: T[] } | null
  const items = row?.items
  return Array.isArray(items) ? items : []
}

/** Pick safe scalar / object fields for JSON to the client. */
function sanitizeSummary(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null
  const keys = [
    'target',
    'first_seen',
    'rank',
    'backlinks',
    'backlinks_spam_score',
    'crawled_pages',
    'target_spam_score',
    'internal_links_count',
    'external_links_count',
    'broken_backlinks',
    'broken_pages',
    'referring_domains',
    'referring_domains_nofollow',
    'referring_main_domains',
    'referring_main_domains_nofollow',
    'referring_ips',
    'referring_subnets',
    'referring_pages',
    'referring_pages_nofollow',
    'referring_links_tld',
    'referring_links_types',
    'referring_links_attributes',
    'referring_links_platform_types',
    'referring_links_semantic_locations',
    'referring_links_countries',
    'info',
  ] as const
  const out: Record<string, unknown> = {}
  for (const k of keys) {
    if (k in row && row[k] !== undefined) out[k] = row[k]
  }
  return out
}

export interface BacklinksFetchResult {
  target: string
  fetchedAt: string
  costs: { summary?: number; referringDomains?: number; anchors?: number; domainPages?: number; backlinks?: number }
  errors: Partial<Record<'summary' | 'referringDomains' | 'anchors' | 'domainPages' | 'backlinks', string>>
  summary: Record<string, unknown> | null
  referringDomains: Array<{
    domain?: string
    rank?: number
    backlinks?: number
    referring_pages?: number
    referring_domains?: number
    first_seen?: string
    backlinks_spam_score?: number
  }>
  anchors: Array<{
    anchor?: string
    backlinks?: number
    referring_domains?: number
    referring_pages?: number
    rank?: number
    backlinks_spam_score?: number
  }>
  domainPages: Array<{
    page?: string
    title?: string
    rank?: number
    backlinks?: number
    referring_domains?: number
    referring_pages?: number
    page_spam_score?: number
  }>
  sampleBacklinks: Array<{
    domain_from?: string
    url_from?: string
    url_to?: string
    anchor?: string
    dofollow?: boolean
    rank?: number
    domain_from_rank?: number
    page_from_rank?: number
    item_type?: string
    first_seen?: string
    last_seen?: string
    is_new?: boolean
    is_lost?: boolean
    is_broken?: boolean
    backlink_spam_score?: number
    attributes?: string[]
    semantic_location?: string
    links_count?: number
  }>
}

export async function fetchBacklinksProfile(
  credentials: { login: string; password: string },
  rawDomain: string,
): Promise<BacklinksFetchResult> {
  const target = normalizeTargetDomain(rawDomain)
  const fetchedAt = new Date().toISOString()
  const baseTask = {
    target,
    include_subdomains: true,
    rank_scale: 'one_hundred' as const,
    backlinks_status_type: 'live' as const,
  }

  const [summaryE, refE, ancE, pagesE, blE] = await Promise.all([
    dfsPost(URLS.summary, credentials, [
      {
        ...baseTask,
        internal_list_limit: 25,
      },
    ]),
    dfsPost(URLS.referringDomains, credentials, [
      {
        ...baseTask,
        limit: 25,
        order_by: ['rank,desc'],
      },
    ]),
    dfsPost(URLS.anchors, credentials, [
      {
        ...baseTask,
        limit: 20,
        order_by: ['backlinks,desc'],
      },
    ]),
    dfsPost(URLS.domainPages, credentials, [
      {
        ...baseTask,
        limit: 15,
        order_by: ['page_summary.backlinks,desc'],
      },
    ]),
    dfsPost(URLS.backlinks, credentials, [
      {
        ...baseTask,
        limit: 20,
        mode: 'as_is',
        order_by: ['rank,desc'],
      },
    ]),
  ])

  const errors: BacklinksFetchResult['errors'] = {}
  if (taskError(summaryE)) errors.summary = taskError(summaryE) ?? 'Summary failed'
  if (taskError(refE)) errors.referringDomains = taskError(refE) ?? 'Referring domains failed'
  if (taskError(ancE)) errors.anchors = taskError(ancE) ?? 'Anchors failed'
  if (taskError(pagesE)) errors.domainPages = taskError(pagesE) ?? 'Domain pages failed'
  if (taskError(blE)) errors.backlinks = taskError(blE) ?? 'Backlinks failed'

  const costs: BacklinksFetchResult['costs'] = {
    summary: summaryE.tasks?.[0]?.cost,
    referringDomains: refE.tasks?.[0]?.cost,
    anchors: ancE.tasks?.[0]?.cost,
    domainPages: pagesE.tasks?.[0]?.cost,
    backlinks: blE.tasks?.[0]?.cost,
  }

  const refItems = firstResultItems<Record<string, unknown>>(refE)
  const referringDomains = refItems.map((it) => ({
    domain: typeof it.domain === 'string' ? it.domain : undefined,
    rank: typeof it.rank === 'number' ? it.rank : undefined,
    backlinks: typeof it.backlinks === 'number' ? it.backlinks : undefined,
    referring_pages: typeof it.referring_pages === 'number' ? it.referring_pages : undefined,
    referring_domains: typeof it.referring_domains === 'number' ? it.referring_domains : undefined,
    first_seen: typeof it.first_seen === 'string' ? it.first_seen : undefined,
    backlinks_spam_score: typeof it.backlinks_spam_score === 'number' ? it.backlinks_spam_score : undefined,
  }))

  const ancItems = firstResultItems<Record<string, unknown>>(ancE)
  const anchors = ancItems.map((it) => ({
    anchor: it.anchor != null && it.anchor !== undefined ? String(it.anchor) : undefined,
    backlinks: typeof it.backlinks === 'number' ? it.backlinks : undefined,
    referring_domains: typeof it.referring_domains === 'number' ? it.referring_domains : undefined,
    referring_pages: typeof it.referring_pages === 'number' ? it.referring_pages : undefined,
    rank: typeof it.rank === 'number' ? it.rank : undefined,
    backlinks_spam_score: typeof it.backlinks_spam_score === 'number' ? it.backlinks_spam_score : undefined,
  }))

  const pageItems = firstResultItems<Record<string, unknown>>(pagesE)
  const domainPages = pageItems.map((it) => {
    const ps = it.page_summary as Record<string, unknown> | undefined
    return {
      page: typeof it.page === 'string' ? it.page : undefined,
      title: typeof it.title === 'string' ? it.title : undefined,
      rank: typeof it.rank === 'number' ? it.rank : undefined,
      backlinks:
        typeof it.backlinks === 'number'
          ? it.backlinks
          : ps && typeof ps.backlinks === 'number'
            ? ps.backlinks
            : undefined,
      referring_domains:
        typeof it.referring_domains === 'number'
          ? it.referring_domains
          : ps && typeof ps.referring_domains === 'number'
            ? ps.referring_domains
            : undefined,
      referring_pages:
        typeof it.referring_pages === 'number'
          ? it.referring_pages
          : ps && typeof ps.referring_pages === 'number'
            ? ps.referring_pages
            : undefined,
      page_spam_score: typeof it.page_spam_score === 'number' ? it.page_spam_score : undefined,
    }
  })

  const blItems = firstResultItems<Record<string, unknown>>(blE)
  const sampleBacklinks = blItems.map((it) => ({
    domain_from: typeof it.domain_from === 'string' ? it.domain_from : undefined,
    url_from: typeof it.url_from === 'string' ? it.url_from : undefined,
    url_to: typeof it.url_to === 'string' ? it.url_to : undefined,
    anchor: typeof it.anchor === 'string' ? it.anchor : undefined,
    dofollow: typeof it.dofollow === 'boolean' ? it.dofollow : undefined,
    rank: typeof it.rank === 'number' ? it.rank : undefined,
    domain_from_rank: typeof it.domain_from_rank === 'number' ? it.domain_from_rank : undefined,
    page_from_rank: typeof it.page_from_rank === 'number' ? it.page_from_rank : undefined,
    item_type: typeof it.item_type === 'string' ? it.item_type : undefined,
    first_seen: typeof it.first_seen === 'string' ? it.first_seen : undefined,
    last_seen: typeof it.last_seen === 'string' ? it.last_seen : undefined,
    is_new: typeof it.is_new === 'boolean' ? it.is_new : undefined,
    is_lost: typeof it.is_lost === 'boolean' ? it.is_lost : undefined,
    is_broken: typeof it.is_broken === 'boolean' ? it.is_broken : undefined,
    backlink_spam_score: typeof it.backlink_spam_score === 'number' ? it.backlink_spam_score : undefined,
    attributes: Array.isArray(it.attributes) ? (it.attributes as string[]) : undefined,
    semantic_location: typeof it.semantic_location === 'string' ? it.semantic_location : undefined,
    links_count: typeof it.links_count === 'number' ? it.links_count : undefined,
  }))

  return {
    target,
    fetchedAt,
    costs,
    errors,
    summary: errors.summary ? null : sanitizeSummary(firstResultRow(summaryE)),
    referringDomains: errors.referringDomains ? [] : referringDomains,
    anchors: errors.anchors ? [] : anchors,
    domainPages: errors.domainPages ? [] : domainPages,
    sampleBacklinks: errors.backlinks ? [] : sampleBacklinks,
  }
}
