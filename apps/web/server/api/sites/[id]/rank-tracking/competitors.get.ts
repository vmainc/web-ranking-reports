import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

interface CompetitorItem {
  domain: string
  reason?: string
}

const COMPETITORS_KEY = 'rank_tracking_competitors'

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
      .getFirstListItem<{ value?: Record<string, unknown> }>(`key="${COMPETITORS_KEY}"`)

    const siteData = row?.value?.[siteId]
    const list = Array.isArray(siteData) ? siteData : []
    const competitors: CompetitorItem[] = list
      .map((item) => (item && typeof item === 'object' ? item as CompetitorItem : null))
      .filter((item): item is CompetitorItem => !!item && typeof item.domain === 'string')

    return { competitors }
  } catch {
    return { competitors: [] }
  }
})

