import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getSubscriptionStatus } from '~/server/services/subscriptions'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)

  return await getSubscriptionStatus(pb, userId)
})

