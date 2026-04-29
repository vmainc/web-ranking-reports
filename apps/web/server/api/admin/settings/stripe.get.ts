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
    const row = await pb.collection('app_settings').getFirstListItem<{
      value: {
        test_publishable_key?: string
        test_secret_key?: string
        live_publishable_key?: string
        live_secret_key?: string
      }
    }>('key="stripe_keys"')
    const value = row?.value ?? {}
    return {
      test_publishable_key: value.test_publishable_key ?? '',
      test_secret_key: value.test_secret_key ?? '',
      live_publishable_key: value.live_publishable_key ?? '',
      live_secret_key: value.live_secret_key ?? '',
    }
  } catch {
    return {
      test_publishable_key: '',
      test_secret_key: '',
      live_publishable_key: '',
      live_secret_key: '',
    }
  }
})

