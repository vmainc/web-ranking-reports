import { getMethod, readBody } from 'h3'
import { ClientResponseError } from 'pocketbase'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { pbFilterString } from '~/server/utils/seoptimerServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PUT') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { webhookKey?: string | null }
  const raw = body.webhookKey
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  const webhookKey = trimmed.length ? trimmed : null
  if (webhookKey && webhookKey.length > 200) {
    throw createError({ statusCode: 400, message: 'Webhook key is too long' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)

  if (webhookKey) {
    const esc = pbFilterString(webhookKey)
    try {
      const matches = await pb.collection('users').getFullList<{ id: string }>({
        filter: `seoptimer_webhook_key = "${esc}"`,
        batch: 20,
      })
      if (matches.some((u) => u.id !== userId)) {
        throw createError({ statusCode: 409, message: 'This SEOptimer key is already used by another account' })
      }
    } catch (e: unknown) {
      const http = (e as { statusCode?: number })?.statusCode
      if (http === 409) throw e
      if (e instanceof ClientResponseError && (e.status === 400 || e.status === 404)) {
        throw createError({
          statusCode: 503,
          message:
            'Database schema is missing SEOptimer fields. Restart the PocketBase container after deploying so migrations apply, then try again.',
        })
      }
      throw e
    }
  }

  try {
    await pb.collection('users').update(userId, { seoptimer_webhook_key: webhookKey })
  } catch (e: unknown) {
    if (e instanceof ClientResponseError && (e.status === 400 || e.status === 404)) {
      throw createError({
        statusCode: 503,
        message:
          'Database schema is missing SEOptimer fields. Restart the PocketBase container after deploying so migrations apply, then try again.',
      })
    }
    throw e
  }

  return { ok: true, webhookKeyConfigured: !!webhookKey }
})
