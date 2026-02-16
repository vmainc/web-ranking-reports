import { getAdminPb, adminAuth, getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const adminEmails = getAdminEmails()
  const pb = getAdminPb()
  await adminAuth(pb)
  const userRecord = await pb.collection('users').getOne<{ email?: string }>(userId)
  const userEmail = userRecord?.email?.toLowerCase?.()
  if (!userEmail || !adminEmails.map((e: string) => e.toLowerCase()).includes(userEmail)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value: { client_id?: string; client_secret?: string } }>('key="google_oauth"')
    const value = row?.value ?? {}
    return {
      client_id: value.client_id ?? '',
      client_secret: value.client_secret ?? '',
    }
  } catch {
    return { client_id: '', client_secret: '' }
  }
})
