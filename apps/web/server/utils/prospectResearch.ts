import type PocketBase from 'pocketbase'
import { createError } from 'h3'
import { getClaudeConfig } from '~/server/utils/claude'
import { getDataForSeoCredentials, normalizeTargetDomain } from '~/server/utils/dataforseo'
import { fetchDomainRankedKeywords } from '~/server/utils/dataforseoLabs'

export const WORKSPACE_RESEARCH_KEY = 'workspace_research'
export const MAX_WORKSPACE_RESEARCH_ITEMS = 20

export type ProspectCompetitor = { domain: string; reason?: string }
export type ProspectSharedKeyword = { keyword: string; reason?: string }
export type ProspectDomainKeyword = {
  keyword: string
  position: number
  searchVolume?: number | null
  url?: string
}

export type ProspectResearchItem = {
  researchType?: 'keyword' | 'domain'
  seedKeyword: string
  contextDomain?: string
  targetDomain?: string
  competitors: ProspectCompetitor[]
  sharedKeywords: ProspectSharedKeyword[]
  domainKeywords?: ProspectDomainKeyword[]
  totalKeywordCount?: number
  updatedAt: string
}

export function normalizeDomain(value: string): string {
  return normalizeTargetDomain(value)
}

export function normalizeSeedKeyword(value: string): string {
  return value.trim().toLowerCase()
}

function extractJsonObject(text: string): string {
  let jsonText = text.trim()
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```[a-zA-Z]*\s*/u, '').replace(/```$/u, '').trim()
  }
  const firstBrace = jsonText.indexOf('{')
  const lastBrace = jsonText.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    jsonText = jsonText.slice(firstBrace, lastBrace + 1)
  }
  return jsonText
}

function isDomainResearch(value: unknown): value is ProspectResearchItem {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return v.researchType === 'domain' && typeof v.targetDomain === 'string' && Array.isArray(v.domainKeywords)
}

function isKeywordResearch(value: unknown): value is ProspectResearchItem {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (v.researchType === 'domain') return false
  return typeof v.seedKeyword === 'string' && Array.isArray(v.competitors) && Array.isArray(v.sharedKeywords)
}

export function isProspectResearchItem(value: unknown): value is ProspectResearchItem {
  return isDomainResearch(value) || isKeywordResearch(value)
}

export function normalizeSavedProspectResearch(value: unknown): ProspectResearchItem[] {
  if (Array.isArray(value)) return value.filter(isProspectResearchItem)
  if (isProspectResearchItem(value)) return [value]
  if (value && typeof value === 'object') {
    const items = (value as { items?: unknown }).items
    if (Array.isArray(items)) return items.filter(isProspectResearchItem)
  }
  return []
}

export function researchMatchKey(item: ProspectResearchItem): string {
  if (item.researchType === 'domain' || (item.targetDomain && item.domainKeywords)) {
    return `domain:${normalizeDomain(item.targetDomain || '').toLowerCase()}`
  }
  return `keyword:${normalizeSeedKeyword(item.seedKeyword)}`
}

export async function loadWorkspaceResearchItems(
  pb: PocketBase,
  ownerId: string,
): Promise<ProspectResearchItem[]> {
  try {
    const row = await pb
      .collection('app_settings')
      .getFirstListItem<{ value?: Record<string, unknown> }>(`key="${WORKSPACE_RESEARCH_KEY}"`)
    return normalizeSavedProspectResearch(row?.value?.[ownerId])
  } catch {
    return []
  }
}

export async function upsertWorkspaceResearchItem(
  pb: PocketBase,
  ownerId: string,
  item: ProspectResearchItem,
): Promise<ProspectResearchItem[]> {
  let row: { id: string; value?: Record<string, unknown> } | null = null
  try {
    row = await pb
      .collection('app_settings')
      .getFirstListItem<{ id: string; value?: Record<string, unknown> }>(`key="${WORKSPACE_RESEARCH_KEY}"`)
  } catch {
    row = null
  }

  const current: Record<string, unknown> = row?.value && typeof row.value === 'object' ? { ...row.value } : {}
  const existing = normalizeSavedProspectResearch(current[ownerId])
  const key = researchMatchKey(item)
  const nextItems = [
    item,
    ...existing.filter((rowItem) => researchMatchKey(rowItem) !== key),
  ].slice(0, MAX_WORKSPACE_RESEARCH_ITEMS)
  current[ownerId] = nextItems

  if (row) {
    await pb.collection('app_settings').update(row.id, { value: current })
  } else {
    await pb.collection('app_settings').create({ key: WORKSPACE_RESEARCH_KEY, value: current })
  }
  return nextItems
}

export async function runProspectKeywordResearch(
  pb: PocketBase,
  opts: { seedKeyword: string; contextDomain?: string },
): Promise<ProspectResearchItem> {
  const seedKeyword = opts.seedKeyword.trim()
  if (!seedKeyword) throw createError({ statusCode: 400, message: 'Seed keyword is required.' })
  if (seedKeyword.length > 120) throw createError({ statusCode: 400, message: 'Seed keyword is too long.' })

  const contextDomain = opts.contextDomain ? normalizeDomain(opts.contextDomain) : ''
  if (contextDomain && !contextDomain.includes('.')) {
    throw createError({ statusCode: 400, message: 'Enter a valid related domain (e.g. prospect.com).' })
  }

  const config = await getClaudeConfig(pb)
  if (!config) {
    throw createError({
      statusCode: 503,
      message: 'Claude is not configured. Add Claude API settings in Admin → Integrations first.',
    })
  }

  const endpoint = process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages'
  const prompt = [
    'You are an SEO market researcher helping an agency evaluate a potential new client.',
    contextDomain ? `Prospect / related domain: ${contextDomain}` : 'No prospect domain provided — research the topic generally.',
    `Seed keyword/topic: ${seedKeyword}`,
    '',
    'Task:',
    '1) Suggest likely SEO competitor domains for this keyword/topic' + (contextDomain ? ' (exclude the prospect domain).' : '.'),
    '2) Suggest important shared keywords competitors likely target for this topic.',
    '',
    'Return ONLY JSON in this exact shape:',
    '{',
    '  "competitors": [',
    '    { "domain": "example.com", "reason": "short reason" }',
    '  ],',
    '  "sharedKeywords": [',
    '    { "keyword": "keyword phrase", "reason": "short reason" }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- competitors: 5-8 items, root domains only' + (contextDomain ? ', exclude the prospect domain.' : '.'),
    '- sharedKeywords: 15-25 items, specific and relevant to the seed keyword.',
    '- Keep each reason under 120 chars.',
    '- No markdown; JSON only.',
  ].join('\n')

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.api_key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 2500,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw createError({
      statusCode: 502,
      message: `Claude research failed: ${res.status} ${text.slice(0, 200)}`,
    })
  }

  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> }
  const content = (data.content ?? [])
    .filter((c) => c?.type === 'text' && c?.text)
    .map((c) => c.text as string)
    .join('\n')
    .trim()

  let competitors: ProspectCompetitor[] = []
  let sharedKeywords: ProspectSharedKeyword[] = []
  try {
    const parsed = JSON.parse(extractJsonObject(content)) as {
      competitors?: Array<{ domain?: string; reason?: string }>
      sharedKeywords?: Array<{ keyword?: string; reason?: string }>
    }

    const seenDomains = new Set<string>()
    competitors = (parsed.competitors ?? [])
      .map((item) => ({
        domain: normalizeDomain(item.domain || ''),
        reason: (item.reason || '').trim(),
      }))
      .filter((item) => item.domain && item.domain.includes('.') && item.domain !== contextDomain)
      .filter((item) => {
        if (seenDomains.has(item.domain)) return false
        seenDomains.add(item.domain)
        return true
      })
      .slice(0, 8)

    const seenKeywords = new Set<string>()
    sharedKeywords = (parsed.sharedKeywords ?? [])
      .map((item) => ({
        keyword: (item.keyword || '').trim(),
        reason: (item.reason || '').trim(),
      }))
      .filter((item) => item.keyword.length > 0)
      .filter((item) => {
        const key = item.keyword.toLowerCase()
        if (seenKeywords.has(key)) return false
        seenKeywords.add(key)
        return true
      })
      .slice(0, 30)
  } catch {
    competitors = []
    sharedKeywords = []
  }

  return {
    researchType: 'keyword',
    seedKeyword,
    contextDomain: contextDomain || undefined,
    competitors,
    sharedKeywords,
    updatedAt: new Date().toISOString(),
  }
}

export async function runProspectDomainResearch(
  pb: PocketBase,
  opts: { targetDomain: string; limit?: number },
): Promise<ProspectResearchItem> {
  const targetDomainRaw = (opts.targetDomain || '').trim()
  if (!targetDomainRaw) throw createError({ statusCode: 400, message: 'Domain is required.' })
  if (targetDomainRaw.length > 253) throw createError({ statusCode: 400, message: 'Domain is too long.' })

  const targetDomain = normalizeDomain(targetDomainRaw)
  if (!targetDomain.includes('.')) {
    throw createError({ statusCode: 400, message: 'Enter a valid domain (e.g. competitor.com).' })
  }

  const limit = typeof opts.limit === 'number' && Number.isFinite(opts.limit)
    ? Math.min(Math.max(Math.round(opts.limit), 1), 1000)
    : 100

  const credentials = await getDataForSeoCredentials(pb)
  if (!credentials) {
    throw createError({
      statusCode: 503,
      message: 'DataForSEO is not configured. An admin can add credentials in Admin → Integrations.',
    })
  }

  const fetched = await fetchDomainRankedKeywords(credentials, targetDomain, { limit })
  if (fetched.error) {
    throw createError({ statusCode: 502, message: fetched.error })
  }

  return {
    researchType: 'domain',
    targetDomain: fetched.targetDomain,
    seedKeyword: '',
    competitors: [],
    sharedKeywords: [],
    domainKeywords: fetched.keywords.map((row) => ({
      keyword: row.keyword,
      position: row.position,
      searchVolume: row.searchVolume,
      url: row.url || undefined,
    })),
    totalKeywordCount: fetched.totalCount,
    updatedAt: new Date().toISOString(),
  }
}
