import { getRequestURL } from 'h3'
import { ClientResponseError } from 'pocketbase'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  let webhookUrl: string
  try {
    const req = getRequestURL(event)
    webhookUrl = `${req.protocol}//${req.host}`.replace(/\/+$/, '') + '/api/webhooks/seoptimer'
  } catch {
    const config = useRuntimeConfig()
    const base = String(config.public.appUrl || '').replace(/\/+$/, '')
    webhookUrl = `${base}/api/webhooks/seoptimer`
  }

  const admin = getAdminPb()
  try {
    await adminAuth(admin)
  } catch {
    throw createError({ statusCode: 503, message: 'Server is not configured to read account settings (admin auth).' })
  }

  try {
    const user = await admin.collection('users').getOne(userId)
    const seoptimer_webhook_key = (user as { seoptimer_webhook_key?: string }).seoptimer_webhook_key
    const webhookKeyConfigured = !!(seoptimer_webhook_key && String(seoptimer_webhook_key).trim())
    return { webhookUrl, webhookKeyConfigured }
  } catch (e: unknown) {
    if (e instanceof ClientResponseError) {
      const msg = (e.response as { message?: string })?.message || e.message || ''
      if (e.status === 404) {
        throw createError({ statusCode: 404, message: 'User record not found' })
      }
      if (e.status === 400 || e.status === 403) {
        console.error('[seoptimer-settings] PocketBase get user failed', e.status, msg)
        throw createError({
          statusCode: 502,
          message:
            'Could not load your profile from the database. If you recently deployed, restart PocketBase so migrations run (users.seoptimer_webhook_key).',
        })
      }
    }
    throw e
  }
})
