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

  const body = (await readBody(event).catch(() => ({}))) as { api_key?: string }
  const api_key = typeof body?.api_key === 'string' ? body.api_key.trim() : ''

  const value = { api_key }

  try {
    const list = await pb.collection('app_settings').getFullList<{ id: string }>({ filter: 'key="pagespeed_api_key"' })
    if (list.length > 0) {
      await pb.collection('app_settings').update(list[0].id, { value })
    } else {
      await pb.collection('app_settings').create({ key: 'pagespeed_api_key', value })
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
