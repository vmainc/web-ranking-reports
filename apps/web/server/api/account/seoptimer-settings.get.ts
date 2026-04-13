import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const config = useRuntimeConfig(event)
  const base = (config.public.appUrl as string)?.replace(/\/+$/, '') || ''
  const webhookUrl = `${base}/api/webhooks/seoptimer`

  const admin = getAdminPb()
  await adminAuth(admin)
  const user = await admin.collection('users').getOne(userId)
  const seoptimer_webhook_key = (user as { seoptimer_webhook_key?: string }).seoptimer_webhook_key
  const webhookKeyConfigured = !!(seoptimer_webhook_key && String(seoptimer_webhook_key).trim())

  return { webhookUrl, webhookKeyConfigured }
})
