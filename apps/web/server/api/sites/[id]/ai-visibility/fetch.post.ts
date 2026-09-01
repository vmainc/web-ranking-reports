import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { resolveSiteAiVisibilitySnapshot } from '~/server/utils/siteAiVisibilitySnapshot'

/**
 * On-demand LLM Mentions refresh (domain + up to 5 rank-tracked keywords).
 * Same DataForSEO credentials as rank tracking.
 */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const { site } = await assertSiteAccess(pb, siteId, userId, false)

  const body = (await readBody(event).catch(() => ({}))) as { maxKeywords?: number }
  const maxKeywords =
    typeof body.maxKeywords === 'number' && Number.isFinite(body.maxKeywords)
      ? Math.max(0, Math.min(5, Math.round(body.maxKeywords)))
      : undefined

  return await resolveSiteAiVisibilitySnapshot(pb, siteId, site, { refresh: true, maxKeywords })
})
