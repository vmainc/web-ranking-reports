import { getAdminPb, adminAuth, getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const userRecord = await pb.collection('users').getOne<{ email?: string }>(userId)
  const userEmail = userRecord?.email?.toLowerCase?.()
  const adminEmails = getAdminEmails().map((e: string) => e.toLowerCase())
  if (!userEmail || !adminEmails.includes(userEmail)) throw createError({ statusCode: 403, message: 'Forbidden' })

  const body = (await readBody(event).catch(() => ({}))) as { api_key?: string }
  const next = typeof body.api_key === 'string' ? body.api_key.trim() : ''

  let apiKey = next
  if (!apiKey) {
    try {
      const existing = await pb.collection('app_settings').getFirstListItem<{ value?: { api_key?: string } }>('key="accuweather"')
      apiKey = existing?.value?.api_key ?? ''
    } catch {
      apiKey = ''
    }
  }

  const value = { api_key: apiKey }
  try {
    const existing = await pb.collection('app_settings').getFirstListItem<{ id: string }>('key="accuweather"')
    await pb.collection('app_settings').update(existing.id, { value })
  } catch {
    await pb.collection('app_settings').create({ key: 'accuweather', value })
  }

  return { ok: true }
})

