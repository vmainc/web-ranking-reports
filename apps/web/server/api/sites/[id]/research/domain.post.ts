import { getMethod, getRouterParam, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getDataForSeoCredentials, normalizeTargetDomain } from '~/server/utils/dataforseo'
import { fetchDomainRankedKeywords } from '~/server/utils/dataforseoLabs'

interface DomainKeywordItem {
  keyword: string
  position: number
  searchVolume?: number | null
  url?: string
}

interface DomainResearchResult {
  researchType: 'domain'
  targetDomain: string
  seedKeyword: string
  competitors: []
  sharedKeywords: []
  domainKeywords: DomainKeywordItem[]
  totalKeywordCount?: number
  updatedAt: string
}

type SavedResearch = DomainResearchResult | {
  researchType?: 'keyword'
  seedKeyword: string
  competitors: unknown[]
  sharedKeywords: unknown[]
  updatedAt: string
}

const RESEARCH_KEY = 'site_research'
const MAX_RESEARCH_ITEMS_PER_SITE = 20

function normalizeDomain(value: string): string {
  return normalizeTargetDomain(value)
}

function normalizeDomainKey(value: string): string {
  return normalizeDomain(value).toLowerCase()
}

function isDomainResearchResult(value: unknown): value is DomainResearchResult {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return v.researchType === 'domain' && typeof v.targetDomain === 'string' && Array.isArray(v.domainKeywords)
}

function isSavedResearch(value: unknown): value is SavedResearch {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (v.researchType === 'domain') return isDomainResearchResult(value)
  return typeof v.seedKeyword === 'string' && Array.isArray(v.competitors) && Array.isArray(v.sharedKeywords)
}

function normalizeSavedResearch(value: unknown): SavedResearch[] {
  if (Array.isArray(value)) return value.filter(isSavedResearch)
  if (isSavedResearch(value)) return [value]
  if (value && typeof value === 'object') {
    const items = (value as { items?: unknown }).items
    if (Array.isArray(items)) return items.filter(isSavedResearch)
  }
  return []
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const body = (await readBody(event).catch(() => ({}))) as { targetDomain?: string; limit?: number }
  const targetDomainRaw = (body.targetDomain || '').trim()
  if (!targetDomainRaw) throw createError({ statusCode: 400, message: 'Domain is required.' })
  if (targetDomainRaw.length > 253) throw createError({ statusCode: 400, message: 'Domain is too long.' })

  const targetDomain = normalizeDomain(targetDomainRaw)
  if (!targetDomain.includes('.')) {
    throw createError({ statusCode: 400, message: 'Enter a valid domain (e.g. competitor.com).' })
  }

  const limit = typeof body.limit === 'number' && Number.isFinite(body.limit)
    ? Math.min(Math.max(Math.round(body.limit), 1), 1000)
    : 100

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

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

  const domainKeywords: DomainKeywordItem[] = fetched.keywords.map((row) => ({
    keyword: row.keyword,
    position: row.position,
    searchVolume: row.searchVolume,
    url: row.url || undefined,
  }))

  const result: DomainResearchResult = {
    researchType: 'domain',
    targetDomain: fetched.targetDomain,
    seedKeyword: '',
    competitors: [],
    sharedKeywords: [],
    domainKeywords,
    totalKeywordCount: fetched.totalCount,
    updatedAt: new Date().toISOString(),
  }

  let row: { id: string; value?: Record<string, unknown> } | null = null
  try {
    row = await pb
      .collection('app_settings')
      .getFirstListItem<{ id: string; value?: Record<string, unknown> }>(`key="${RESEARCH_KEY}"`)
  } catch {
    row = null
  }

  const current: Record<string, unknown> = row?.value && typeof row.value === 'object' ? { ...row.value } : {}
  const existing = normalizeSavedResearch(current[siteId])
  const normalizedTarget = normalizeDomainKey(result.targetDomain)
  const nextItems = [
    result,
    ...existing.filter((item) => {
      if (isDomainResearchResult(item)) {
        return normalizeDomainKey(item.targetDomain) !== normalizedTarget
      }
      return true
    }),
  ].slice(0, MAX_RESEARCH_ITEMS_PER_SITE)
  current[siteId] = nextItems

  if (row) {
    await pb.collection('app_settings').update(row.id, { value: current })
  } else {
    await pb.collection('app_settings').create({ key: RESEARCH_KEY, value: current })
  }

  return { research: result, researchItems: nextItems }
})
