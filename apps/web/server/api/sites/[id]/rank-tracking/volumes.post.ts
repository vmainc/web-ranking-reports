import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { fetchGoogleAdsSearchVolumesChunked, getDataForSeoCredentials } from '~/server/utils/dataforseo'

/**
 * Refresh `search_volume` on rank_keywords using DataForSEO Keywords Data API
 * Google Ads search_volume **live** (immediate monthly volumes, US / en).
 */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const creds = await getDataForSeoCredentials(pb)
  if (!creds) {
    throw createError({
      statusCode: 503,
      message: 'DataForSEO is not configured. An admin can add credentials in Admin → Integrations.',
    })
  }

  const rows = await pb.collection('rank_keywords').getFullList<{ id: string; keyword?: string }>({
    filter: `site = "${siteId.replace(/"/g, '\\"')}"`,
  })

  const keywords = rows.map((r) => (typeof r.keyword === 'string' ? r.keyword.trim() : '')).filter(Boolean)
  if (!keywords.length) {
    return { updated: 0, message: 'No keywords to refresh.' }
  }

  let volumeByNorm: Map<string, number>
  try {
    volumeByNorm = await fetchGoogleAdsSearchVolumesChunked(creds, keywords)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    throw createError({ statusCode: 502, message: `Search volume request failed: ${msg}` })
  }

  let updated = 0
  for (const row of rows) {
    const kw = typeof row.keyword === 'string' ? row.keyword.trim() : ''
    if (!kw) continue
    const norm = kw.toLowerCase()
    if (!volumeByNorm.has(norm)) continue
    const sv = volumeByNorm.get(norm)!
    try {
      await pb.collection('rank_keywords').update(row.id, { search_volume: sv })
      updated++
    } catch {
      // skip row errors
    }
  }

  return {
    updated,
    keywordsRequested: keywords.length,
    message:
      updated > 0
        ? `Updated monthly volume for ${updated} keyword(s) (DataForSEO Live).`
        : 'No volumes returned (check keywords or DataForSEO account).',
  }
})
