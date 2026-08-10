import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { markRankKeywordsRefreshQueued, runRankFetchForSite } from '~/server/utils/rankTrackingFetch'
import { backfillMissingRankKeywordVolumes, getDataForSeoCredentials } from '~/server/utils/dataforseo'

/**
 * Manual rank refresh. Full SERP checks for many keywords often exceed Cloudflare’s
 * ~100s limit (524). Kick off work in the background and let the UI poll list.get.
 */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const user = await pb.collection('users').getOne<{ email?: string }>(userId)
  const email = String(user.email || '').trim().toLowerCase()
  if (email !== 'doughigson@gmail.com') {
    throw createError({ statusCode: 403, message: 'Manual rank refresh is not available for this account.' })
  }

  const site = await assertSiteOwnership(pb, siteId, userId)
  const domain = site.domain
  if (!domain?.trim()) throw createError({ statusCode: 400, message: 'Site has no domain' })

  const creds = await getDataForSeoCredentials(pb)
  if (!creds) {
    throw createError({
      statusCode: 503,
      message: 'DataForSEO is not configured. An admin can add credentials in Admin → Integrations.',
    })
  }

  // Quick probe: collection must exist
  try {
    await pb.collection('rank_keywords').getList(1, 1, { filter: `site = "${siteId}"` })
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string }
    if (err?.status === 404 || (err?.message && /requested resource wasn't found|collection.*not found/i.test(err.message))) {
      throw createError({
        statusCode: 503,
        message:
          'Rank tracking is not set up. Create the PocketBase collection by running: node scripts/create-collections.mjs from the apps/web directory (with PocketBase running and POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD set).',
      })
    }
    throw e
  }

  await markRankKeywordsRefreshQueued(pb, siteId)

  const sid = siteId
  const domainForFetch = domain.trim()
  void (async () => {
    try {
      const { getAdminPb, adminAuth } = await import('~/server/utils/pbServer')
      const { resolveSiteRankContext } = await import('~/server/utils/siteRankContext')
      const bgPb = getAdminPb()
      await adminAuth(bgPb)
      const siteRow = await bgPb.collection('sites').getOne(sid)

      // Fill missing US volumes in parallel with SERP work (does not block ranks).
      try {
        const rows = await bgPb.collection('rank_keywords').getFullList<{
          id: string
          keyword: string
          search_volume?: number | null
        }>({ filter: `site = "${sid}"` })
        await backfillMissingRankKeywordVolumes(bgPb, creds, rows)
      } catch (e) {
        console.error('[rank-tracking] volume backfill during refresh failed', e)
      }

      await runRankFetchForSite(bgPb, sid, domainForFetch, {
        credentials: creds,
        siteRecord: siteRow,
        rankContext: resolveSiteRankContext(siteRow),
      })
    } catch (e) {
      console.error('[rank-tracking] background SERP refresh failed', e)
      try {
        const { getAdminPb, adminAuth } = await import('~/server/utils/pbServer')
        const { clearRankKeywordsRefreshQueued } = await import('~/server/utils/rankTrackingFetch')
        const errPb = getAdminPb()
        await adminAuth(errPb)
        await clearRankKeywordsRefreshQueued(errPb, sid)
      } catch {
        // ignore
      }
    }
  })()

  return {
    updated: 0,
    rankFetchPending: true,
    message: 'Rankings refresh started in the background. The table will update over the next few minutes.',
    results: [],
  }
})
