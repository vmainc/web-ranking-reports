import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

const MAX_KEYWORDS = 100

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const body = (await readBody(event).catch(() => ({}))) as { keyword?: string; keywords?: string[] }

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
  await assertSiteOwnership(pb, siteId, userId)

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

  const created: unknown[] = []
  for (const keyword of toCreate) {
    try {
      const rec = await pb.collection('rank_keywords').create({
        site: siteId,
        keyword,
      })
      created.push(rec)
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

  return {
    createdCount: created.length,
    totalKeywords: existing.length + created.length,
  }
})
