import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { fetchGoogleAdsSearchVolumes, getDataForSeoCredentials } from '~/server/utils/dataforseo'

const MAX_KEYWORDS = 100

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const body = (await readBody(event).catch(() => ({}))) as {
    keyword?: string
    keywords?: string[]
    /** When true (keyword research flow), fetch Google Ads monthly search volume via DataForSEO and store on each new row. */
    withSearchVolume?: boolean
  }

  // Normalize into an array of keywords (supports single keyword or multiple via body.keywords)
  let incoming = Array.isArray(body.keywords) ? body.keywords : []
  if (!incoming.length && typeof body.keyword === 'string') {
    incoming = [body.keyword]
  }
  const cleaned = incoming
    .map((k) => (typeof k === 'string' ? k.trim() : ''))
    .filter((k) => k.length > 0)

  if (!cleaned.length) {
    throw createError({ statusCode: 400, message: 'At least one keyword is required' })
  }

  // Enforce per-keyword max length
  const tooLong = cleaned.find((k) => k.length > 700)
  if (tooLong) {
    throw createError({ statusCode: 400, message: 'One or more keywords are too long (max 700 characters each).' })
  }

  // Deduplicate incoming by case-insensitive match, keeping original casing
  const byNorm = new Map<string, string>()
  for (const k of cleaned) {
    const norm = k.toLowerCase()
    if (!byNorm.has(norm)) byNorm.set(norm, k)
  }
  const uniqueIncoming = Array.from(byNorm.values())

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

  if (existing.length >= MAX_KEYWORDS) {
    throw createError({
      statusCode: 400,
      message: `Maximum ${MAX_KEYWORDS} keywords per site. Remove some before adding more.`,
    })
  }

  const existingNorm = new Set(
    existing
      .map((r) => (r.keyword || '').toLowerCase())
      .filter((k) => k.length > 0),
  )

  // Filter to only new keywords (not already present), enforce max count
  const availableSlots = Math.max(0, MAX_KEYWORDS - existing.length)
  const toCreate: string[] = []
  for (const k of uniqueIncoming) {
    const norm = k.toLowerCase()
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

  let volumeByNorm = new Map<string, number>()
  if (body.withSearchVolume) {
    const creds = await getDataForSeoCredentials(pb)
    if (creds) {
      try {
        volumeByNorm = await fetchGoogleAdsSearchVolumes(creds, toCreate)
      } catch {
        volumeByNorm = new Map()
      }
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

  let ranksFetched = 0
  if (created.length && site.domain?.trim()) {
    try {
      const { runRankFetchForSite } = await import('~/server/utils/rankTrackingFetch')
      const fr = await runRankFetchForSite(pb, siteId, site.domain, {
        keywordIds: created.map((c) => c.id),
      })
      ranksFetched = fr.updated
    } catch (e) {
      console.error('[rank-tracking] initial SERP fetch after add failed', e)
    }
  }

  return {
    createdCount: created.length,
    totalKeywords: existing.length + created.length,
    ranksFetched,
  }
})
