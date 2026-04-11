import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = event.context.params?.id
  if (!siteId) throw createError({ statusCode: 400, message: 'Missing site id' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const { site, canWrite } = await assertSiteAccess(pb, siteId, userId, false, { skipBillingCheck: true })

  return { site, canWrite }
})
