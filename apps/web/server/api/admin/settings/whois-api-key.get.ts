import { getAdminPb, adminAuth, getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
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

  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value: { api_key?: string } }>('key="apilayer_whois"')
    const value = row?.value ?? {}
    return { api_key: value.api_key ?? '' }
  } catch {
    return { api_key: '' }
  }
})
