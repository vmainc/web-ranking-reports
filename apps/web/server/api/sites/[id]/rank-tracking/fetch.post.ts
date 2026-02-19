import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import {
  getDataForSeoCredentials,
  fetchSerpRank,
  type SerpRankResult,
} from '~/server/utils/dataforseo'

interface RankKeywordRow {
  id: string
  site: string
  keyword: string
  last_result_json?: Record<string, unknown> | null
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const site = await assertSiteOwnership(pb, siteId, userId)
  const domain = (site as { domain?: string }).domain
  if (!domain?.trim()) throw createError({ statusCode: 400, message: 'Site has no domain' })

  const credentials = await getDataForSeoCredentials(pb)
  if (!credentials) {
    throw createError({
      statusCode: 503,
      message: 'DataForSEO is not configured. An admin can add credentials in Admin → Integrations.',
    })
  }

  const keywords = await pb.collection('rank_keywords').getFullList<RankKeywordRow>({
    filter: `site = "${siteId}"`,
    sort: 'keyword',
  })
  if (keywords.length === 0) {
    return { updated: 0, message: 'No keywords to fetch.' }
  }

  const results: { id: string; keyword: string; result: SerpRankResult }[] = []
  for (const row of keywords) {
    try {
      const result = await fetchSerpRank(credentials, row.keyword, domain)
      await pb.collection('rank_keywords').update(row.id, {
        last_result_json: {
          position: result.position,
          rankAbsolute: result.rankAbsolute,
          url: result.url,
          title: result.title,
          description: result.description,
          domain: result.domain,
          fetchedAt: result.fetchedAt,
          error: result.error,
        },
      })
      results.push({ id: row.id, keyword: row.keyword, result })
      // Avoid rate limits: short delay between requests (DataForSEO allows 2000/min but be conservative)
      await new Promise((r) => setTimeout(r, 500))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      await pb.collection('rank_keywords').update(row.id, {
        last_result_json: {
          position: 0,
          rankAbsolute: 0,
          url: '',
          title: '',
          description: null,
          domain: domain,
          fetchedAt: new Date().toISOString(),
          error: msg,
        },
      })
      results.push({
        id: row.id,
        keyword: row.keyword,
        result: {
          position: 0,
          rankAbsolute: 0,
          url: '',
          title: '',
          description: null,
          domain,
          fetchedAt: new Date().toISOString(),
          error: msg,
        },
      })
    }
  }

  return { updated: results.length, results }
})
