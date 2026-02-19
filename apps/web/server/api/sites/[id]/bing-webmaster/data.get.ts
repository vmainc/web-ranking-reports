import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getBingWebmasterConfig, bingWebmasterGet } from '~/server/utils/bingWebmasterAccess'

/** Bing crawl stats item (Date is /Date(ms)/ or ISO string). */
interface CrawlStatsItem {
  Date?: string
  Code2xx?: number
  Code4xx?: number
  Code5xx?: number
  CrawledPages?: number
  InIndex?: number
  InLinks?: number
  CrawlErrors?: number
  BlockedByRobotsTxt?: number
  [key: string]: unknown
}

/** Bing query stats item. */
interface QueryStatsItem {
  Query?: string
  Date?: string
  Clicks?: number
  Impressions?: number
  AvgClickPosition?: number
  AvgImpressionPosition?: number
  [key: string]: unknown
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const query = getQuery(event)
  const siteUrl = typeof query.siteUrl === 'string' ? query.siteUrl.trim() : ''
  if (!siteUrl) throw createError({ statusCode: 400, message: 'siteUrl query parameter required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const config = await getBingWebmasterConfig(pb, siteId)

  const [crawlRes, queryRes] = await Promise.all([
    bingWebmasterGet<{ d?: CrawlStatsItem[]; Message?: string }>(config.api_key, 'GetCrawlStats', { siteUrl }),
    bingWebmasterGet<{ d?: QueryStatsItem[]; Message?: string }>(config.api_key, 'GetQueryStats', { siteUrl }),
  ])

  const crawlStats = Array.isArray(crawlRes.d) ? crawlRes.d : []
  const queryStats = Array.isArray(queryRes.d) ? queryRes.d : []

  return {
    siteUrl,
    crawlStats,
    queryStats,
  }
})
