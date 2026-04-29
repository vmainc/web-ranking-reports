import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { syncCloudflareDataForUser } from '~/server/utils/runCloudflareSyncJob'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { siteId?: string }
  const siteId = typeof body.siteId === 'string' ? body.siteId.trim() : ''

  const pb = getAdminPb()
  await adminAuth(pb)

  if (siteId) {
    await assertSiteAccess(pb, siteId, userId, false)
  }

  const res = await syncCloudflareDataForUser(pb, userId)
  return { ok: true, ...res }
})

