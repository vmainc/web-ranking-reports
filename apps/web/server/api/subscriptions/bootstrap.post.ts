import { getMethod } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { ensureUserSubscription } from '~/server/services/subscriptions'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const sub = await ensureUserSubscription(pb, userId)
  return { ok: true, plan: sub.plan || 'free', status: sub.status || 'active' }
})

