import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import type { LighthouseReportPayload } from '~/server/utils/lighthouse'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = query.siteId as string
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const list = await pb.collection('reports').getFullList<{ payload_json?: unknown }>({
    filter: `site = "${siteId}" && type = "lighthouse"`,
    sort: '-created',
    limit: 1,
  })
  const report = list[0]
  const payload = report?.payload_json as LighthouseReportPayload | undefined
  if (!payload) return null
  return payload
})
