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
    const data = row?.value?.[siteId]
    if (data && typeof data === 'object') {
      return { research: data as SavedResearch }
    }
  } catch {
    // ignore
  }
  return { research: null }
})

