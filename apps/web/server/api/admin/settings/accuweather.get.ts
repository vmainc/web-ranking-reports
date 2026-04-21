import { getAdminPb, adminAuth, getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'GET') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const userRecord = await pb.collection('users').getOne<{ email?: string }>(userId)
  const userEmail = userRecord?.email?.toLowerCase?.()
  const adminEmails = getAdminEmails().map((e: string) => e.toLowerCase())
  if (!userEmail || !adminEmails.includes(userEmail)) throw createError({ statusCode: 403, message: 'Forbidden' })

  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value?: { api_key?: string } }>('key="accuweather"')
    return { api_key: row?.value?.api_key ?? '' }
  } catch {
    return { api_key: '' }
  }
})

