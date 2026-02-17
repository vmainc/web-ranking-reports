import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import type { LighthouseReportPayload } from '~/server/utils/lighthouse'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = query.siteId as string
  const strategy = (query.strategy as 'mobile' | 'desktop' | undefined) || 'mobile'
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const list = await pb.collection('reports').getList<{ payload_json?: unknown }>(1, 100, {
    filter: `site = "${siteId}" && type = "lighthouse"`,
    sort: '-created',
  })
  // Filter by strategy from payload_json (PocketBase doesn't support JSON field queries directly)
  for (const report of list.items) {
    const payload = report.payload_json as LighthouseReportPayload | undefined
    if (payload?.strategy === strategy) {
      return payload
    }
  }
  return null
})
