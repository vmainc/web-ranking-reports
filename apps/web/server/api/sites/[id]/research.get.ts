import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

interface CompetitorItem {
  domain: string
  reason?: string
}

interface SharedKeywordItem {
  keyword: string
  reason?: string
}

interface SavedResearch {
  seedKeyword: string
  competitors: CompetitorItem[]
  sharedKeywords: SharedKeywordItem[]
  updatedAt: string
}

const RESEARCH_KEY = 'site_research'

function isSavedResearch(value: unknown): value is SavedResearch {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
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
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  try {
    const row = await pb
      .collection('app_settings')
      .getFirstListItem<{ value?: Record<string, unknown> }>(`key="${RESEARCH_KEY}"`)
    const items = normalizeSavedResearch(row?.value?.[siteId])
    if (items.length > 0) {
      return { research: items[0], researchItems: items }
    }
  } catch {
    // ignore
  }
  return { research: null, researchItems: [] }
})

