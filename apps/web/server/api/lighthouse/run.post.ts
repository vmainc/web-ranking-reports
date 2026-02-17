import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { runLighthouseForSite } from '~/server/utils/lighthouse'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { siteId?: string; strategy?: 'mobile' | 'desktop' }
  const siteId = body?.siteId
  const strategy = body?.strategy || 'mobile'
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const payload = await runLighthouseForSite(pb, siteId, strategy)
  return payload ?? { error: 'Lighthouse run produced no result' }
})
