import { getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  try {
    const userId = await getUserIdFromRequest(event)
    if (!userId) {
      return {
        allowed: false,
        hint: 'No valid session. Log in at /auth/login, then open Admin again.',
      }
    }
    const config = useRuntimeConfig()
    const adminEmails = (config.adminEmails as string[]) ?? []
    const { getAdminPb, adminAuth } = await import('~/server/utils/pbServer')
    const pb = getAdminPb()
    await adminAuth(pb)
    const userRecord = await pb.collection('users').getOne<{ email?: string }>(userId)
    const userEmail = userRecord?.email?.toLowerCase?.()
    const allowed = !!userEmail && adminEmails.map((e: string) => e.toLowerCase()).includes(userEmail)
    return {
      allowed,
      hint: !allowed && userEmail
        ? `Add ${userRecord?.email ?? userEmail} to ADMIN_EMAILS in apps/web/.env and restart the dev server.`
        : undefined,
    }
  } catch (e) {
    console.error('Admin check error:', e)
    return {
      allowed: false,
      hint: 'Server error checking access. Ensure PocketBase is running and PB_ADMIN_EMAIL/PB_ADMIN_PASSWORD are set in .env.',
    }
  }
})
