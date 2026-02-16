import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const config = useRuntimeConfig()
  const adminEmails = (config.adminEmails as string[]) ?? []
  const pb = getAdminPb()
  await adminAuth(pb)
  const userRecord = await pb.collection('users').getOne<{ email?: string }>(userId)
  const userEmail = userRecord?.email?.toLowerCase?.()
  if (!userEmail || !adminEmails.map((e: string) => e.toLowerCase()).includes(userEmail)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const body = (await readBody(event).catch(() => ({}))) as { developer_token?: string; client_id?: string; client_secret?: string }
  const developer_token = typeof body?.developer_token === 'string' ? body.developer_token.trim() : ''
  const client_id = typeof body?.client_id === 'string' ? body.client_id.trim() : ''
  const client_secret = typeof body?.client_secret === 'string' ? body.client_secret.trim() : ''

  let value: { developer_token: string; client_id: string; client_secret: string }
  try {
    const list = await pb.collection('app_settings').getFullList<{ id: string; value?: { developer_token?: string; client_id?: string; client_secret?: string } }>({ filter: 'key="google_ads"' })
    const prev = list[0]?.value ?? {}
    value = {
      developer_token: developer_token || (prev.developer_token ?? ''),
      client_id: client_id || (prev.client_id ?? ''),
      client_secret: client_secret || (prev.client_secret ?? ''),
    }
  } catch {
    value = { developer_token, client_id, client_secret }
  }

  try {
    const list = await pb.collection('app_settings').getFullList<{ id: string }>({ filter: 'key="google_ads"' })
    if (list.length > 0) {
      await pb.collection('app_settings').update(list[0].id, { value })
    } else {
      await pb.collection('app_settings').create({ key: 'google_ads', value })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('collection') || msg.includes('404') || msg.includes('not found')) {
      throw createError({
        statusCode: 503,
        message: 'app_settings collection missing. Run: node scripts/create-collections.mjs',
      })
    }
    throw createError({ statusCode: 500, message: msg })
  }

  return { ok: true }
})
