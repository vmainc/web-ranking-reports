import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { runRankFetchForSite } from '~/server/utils/rankTrackingFetch'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const site = await assertSiteOwnership(pb, siteId, userId)
  const domain = site.domain
  if (!domain?.trim()) throw createError({ statusCode: 400, message: 'Site has no domain' })

  const { updated, results, skipReason } = await runRankFetchForSite(pb, siteId, domain)
  if (skipReason === 'no_dataforseo') {
    throw createError({
      statusCode: 503,
      message: 'DataForSEO is not configured. An admin can add credentials in Admin → Integrations.',
    })
  }
  if (skipReason === 'rank_keywords_unavailable') {
    throw createError({
      statusCode: 503,
      message:
        'Rank tracking is not set up. Create the PocketBase collection by running: node scripts/create-collections.mjs from the apps/web directory (with PocketBase running and POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD set).',
    })
  }

  if (updated === 0 && results.length === 0) {
    return { updated: 0, message: 'No keywords to fetch.', results: [] }
  }

  return { updated, results }
})
