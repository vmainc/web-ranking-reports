import { getAdminPb, adminAuth, getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const adminEmails = getAdminEmails()
  const pb = getAdminPb()
  await adminAuth(pb)
  const userRecord = await pb.collection('users').getOne<{ email?: string }>(userId)
  const userEmail = userRecord?.email?.toLowerCase?.()
  if (!userEmail || !adminEmails.map((e: string) => e.toLowerCase()).includes(userEmail)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const body = (await readBody(event).catch(() => ({}))) as { login?: string; password?: string }
  const login = typeof body?.login === 'string' ? body.login.trim() : ''

  let password: string
  try {
    const existing = await pb.collection('app_settings').getFirstListItem<{ value: { password?: string } }>('key="dataforseo"')
    password = typeof body?.password === 'string' && body.password.length > 0 ? body.password : (existing?.value?.password ?? '')
  } catch {
    password = typeof body?.password === 'string' ? body.password : ''
  }

  const value = { login, password }

  try {
    const list = await pb.collection('app_settings').getFullList<{ id: string }>({ filter: 'key="dataforseo"' })
    if (list.length > 0) {
      await pb.collection('app_settings').update(list[0].id, { value })
    } else {
      await pb.collection('app_settings').create({ key: 'dataforseo', value })
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
