import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { fetchGoogleAdsSearchVolumes, getDataForSeoCredentials } from '~/server/utils/dataforseo'
import { assertPlanLimit } from '~/server/utils/planGuard'
import { getRankTrackingKeywordLimitContext } from '~/server/utils/rankTrackingLimits'
import { normalizeKeywordList, keywordDedupeKey } from '~/server/utils/keywordNormalize'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const body = (await readBody(event).catch(() => ({}))) as {
    keyword?: string
    keywords?: string[]
  }

  // Normalize into an array of keywords (supports single keyword or multiple via body.keywords)
  let incoming: unknown[] = Array.isArray(body.keywords) ? body.keywords : []
  if (!incoming.length && typeof body.keyword === 'string') {
    incoming = [body.keyword]
  }
  const { keywords: uniqueIncoming, rejectedTooLong } = normalizeKeywordList(incoming, 700)

  if (!uniqueIncoming.length) {
    throw createError({ statusCode: 400, message: 'At least one keyword is required' })
  }

  if (rejectedTooLong.length) {
    throw createError({ statusCode: 400, message: 'One or more keywords are too long (max 700 characters each).' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  const site = await assertSiteOwnership(pb, siteId, userId)

  let existing: { id: string; keyword?: string }[]
  try {
    existing = await pb.collection('rank_keywords').getFullList<{ id: string; keyword?: string }>({
      filter: `site = "${siteId}"`,
    })
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string }
    if (err?.status === 404 || (err?.message && /requested resource wasn't found|collection.*not found/i.test(err.message))) {
      throw createError({
        statusCode: 503,
        message: 'Rank tracking is not set up. Create the PocketBase collection by running: node scripts/create-collections.mjs from the apps/web directory (with PocketBase running and POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD set).',
      })
    }
    throw e
  }

  const { maxKeywords: siteKeywordMax } = await getRankTrackingKeywordLimitContext(pb, userId, existing.length)

  if (existing.length >= siteKeywordMax) {
    throw createError({
      statusCode: 400,
      message: `Maximum ${siteKeywordMax} keywords on this site for your plan. Remove some before adding more.`,
    })
  }

  const existingNorm = new Set(
    existing
      .map((r) => (r.keyword ? keywordDedupeKey(r.keyword) : ''))
      .filter((k) => k.length > 0),
  )

  // Filter to only new keywords (not already present), enforce max count
  const availableSlots = Math.max(0, siteKeywordMax - existing.length)
  const toCreate: string[] = []
  for (const k of uniqueIncoming) {
    const norm = keywordDedupeKey(k)
    if (existingNorm.has(norm)) continue
    if (toCreate.length >= availableSlots) break
    toCreate.push(k)
  }

  if (!toCreate.length) {
    throw createError({
      statusCode: 400,
      message: 'No new keywords to add (they may already exist or you are at the limit).',
    })
  }

  await assertPlanLimit(pb, userId, 'keywords', toCreate.length)

  // Fetch monthly volume once on keyword creation and persist it on the row.
  let volumeByNorm = new Map<string, number>()
  const creds = await getDataForSeoCredentials(pb)
  if (creds) {
    try {
      volumeByNorm = await fetchGoogleAdsSearchVolumes(creds, toCreate)
    } catch {
      volumeByNorm = new Map()
    }
  }

  const created: { id: string }[] = []
  for (const keyword of toCreate) {
    try {
      const norm = keyword.toLowerCase()
      const search_volume = volumeByNorm.has(norm) ? volumeByNorm.get(norm)! : undefined
      const rec = await pb.collection('rank_keywords').create({
        site: siteId,
        keyword,
        ...(typeof search_volume === 'number' ? { search_volume } : {}),
      })
      const id = typeof (rec as { id?: string }).id === 'string' ? (rec as { id: string }).id : ''
      if (id) created.push({ id })
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      if (err?.status === 404 || (err?.message && /requested resource wasn't found|collection.*not found/i.test(err.message))) {
        throw createError({
          statusCode: 503,
          message: 'Rank tracking is not set up. Create the PocketBase collection by running: node scripts/create-collections.mjs from the apps/web directory (with PocketBase running and POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD set).',
        })
      }
      throw e
    }
  }

  // Initial SERP fetch can take many minutes for bulk adds (sequential DataForSEO + throttle).
  // If we await it here, reverse proxies (e.g. Cloudflare) often return 524 while work already
  // completed in PocketBase — confusing for users. Run fetch in the background instead.
  const createdIds = created.map((c) => c.id)
  const domainForFetch = typeof site.domain === 'string' ? site.domain.trim() : ''
  let rankFetchPending = false
  if (createdIds.length && domainForFetch) {
    rankFetchPending = true
    const sid = siteId
    void (async () => {
      try {
        const { getAdminPb, adminAuth } = await import('~/server/utils/pbServer')
        const { runRankFetchForSite } = await import('~/server/utils/rankTrackingFetch')
        const { resolveSiteRankContext } = await import('~/server/utils/siteRankContext')
        const bgPb = getAdminPb()
        await adminAuth(bgPb)
        const siteRow = await bgPb.collection('sites').getOne(sid)
        await runRankFetchForSite(bgPb, sid, domainForFetch, {
          keywordIds: createdIds,
          siteRecord: siteRow,
          rankContext: resolveSiteRankContext(siteRow),
        })
      } catch (e) {
        console.error('[rank-tracking] background SERP fetch after add failed', e)
      }
    })()
  }

  return {
    createdCount: created.length,
    totalKeywords: existing.length + created.length,
    ranksFetched: 0,
    rankFetchPending,
  }
})
