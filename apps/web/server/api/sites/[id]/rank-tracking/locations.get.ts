/**
 * GET /api/sites/:id/rank-tracking/locations?q=kansas
 * Search DataForSEO Google locations (cached) for the ranking location picker.
 */
import { getRouterParam, getQuery } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { getCachedDfsLocations, searchDfsLocations } from '~/server/utils/dataforseoLocations'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteAccess(pb, siteId, userId, false)

  const q = getQuery(event)
  const query = typeof q.q === 'string' ? q.q : typeof q.query === 'string' ? q.query : ''
  const force = q.refresh === '1' || q.refresh === 'true'

  try {
    const { locations, fetchedAt, fromCache } = await getCachedDfsLocations(pb, { forceRefresh: force })
    const results = searchDfsLocations(locations, query, { countryIso: 'US', limit: 25 })
    return {
      query,
      fetchedAt,
      fromCache,
      results: results.map((r) => ({
        location_code: r.location_code,
        location_name: r.location_name,
        location_type: r.location_type ?? null,
        country_iso_code: r.country_iso_code ?? null,
      })),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw createError({
      statusCode: msg.includes('not configured') ? 503 : 502,
      message: msg.includes('not configured')
        ? 'DataForSEO is not configured. An admin can add credentials in Admin → Integrations.'
        : `Location lookup failed: ${msg}`,
    })
  }
})
