/**
 * Admin diagnostic: run one DataForSEO keyword ranking check without writing to PocketBase.
 * POST /api/admin/rank-tracking/diagnose
 *
 * Body: { domain|siteId, keyword, locationCode?, languageCode?, device?, includeRaw?, useTarget? }
 */
import { getAdminPb, adminAuth, getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'
import { diagnoseKeywordRanking, getDataForSeoCredentials } from '~/server/utils/dataforseo'
import { resolveSiteRankContext } from '~/server/utils/siteRankContext'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const user = await pb.collection('users').getOne<{ email?: string }>(userId)
  const email = String(user.email || '').trim().toLowerCase()
  const adminEmails = getAdminEmails().map((e) => e.toLowerCase().trim())
  if (!adminEmails.includes(email)) {
    throw createError({ statusCode: 403, message: 'Admin only' })
  }

  const body = (await readBody(event).catch(() => ({}))) as {
    siteId?: string
    domain?: string
    keyword?: string
    locationCode?: number
    locationLabel?: string
    languageCode?: string
    device?: 'desktop' | 'mobile'
    depth?: number
    includeSubdomains?: boolean
    includeRaw?: boolean
    useTarget?: boolean
  }

  let domain = typeof body.domain === 'string' ? body.domain.trim() : ''
  let locationCode = typeof body.locationCode === 'number' ? body.locationCode : undefined
  let locationLabel = typeof body.locationLabel === 'string' ? body.locationLabel : undefined
  let languageCode = typeof body.languageCode === 'string' ? body.languageCode : undefined
  let device: 'desktop' | 'mobile' | undefined = body.device === 'mobile' || body.device === 'desktop' ? body.device : undefined
  let includeSubdomains = body.includeSubdomains
  let os: string | undefined

  if (typeof body.siteId === 'string' && body.siteId.trim()) {
    try {
      const site = await pb.collection('sites').getOne(body.siteId.trim())
      if (!domain && typeof site.domain === 'string') domain = site.domain.trim()
      const ctx = resolveSiteRankContext(site)
      if (locationCode == null) locationCode = ctx.locationCode
      if (!locationLabel) locationLabel = ctx.locationName
      if (!languageCode) languageCode = ctx.languageCode
      if (!device) device = ctx.device
      if (includeSubdomains === undefined) includeSubdomains = ctx.includeSubdomains
      os = ctx.os
    } catch {
      throw createError({ statusCode: 404, message: 'Site not found' })
    }
  }

  const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : ''
  if (!domain || !keyword) {
    throw createError({ statusCode: 400, message: 'domain (or siteId) and keyword are required' })
  }

  const creds = await getDataForSeoCredentials(pb)
  if (!creds) {
    throw createError({
      statusCode: 503,
      message: 'DataForSEO is not configured. Add credentials in Admin → Integrations.',
    })
  }

  const includeRaw =
    body.includeRaw === true &&
    (process.env.NODE_ENV !== 'production' || process.env.RANK_TRACKING_DIAGNOSE_RAW === '1')

  return await diagnoseKeywordRanking({
    credentials: creds,
    domain,
    keyword,
    locationCode,
    locationLabel,
    languageCode,
    device: device ?? 'desktop',
    os,
    depth: typeof body.depth === 'number' ? body.depth : undefined,
    includeSubdomains,
    includeRaw,
    useTarget: body.useTarget === true,
  })
})
