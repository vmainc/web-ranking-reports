import { getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  try {
    const auth = event.headers.get('authorization')
    const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : ''
    const userId = await getUserIdFromRequest(event)
    if (!userId || !token) {
      return {
        allowed: false,
        hint: 'No valid session. Log in at /auth/login, then open Admin again.',
      }
    }

    // Use the current user's token to load their own profile/email.
    const base = (useRuntimeConfig().public?.pocketbaseUrl as string || 'http://127.0.0.1:8090').replace(/\/+$/, '')
    const profileRes = await fetch(`${base}/api/collections/users/records/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!profileRes.ok) {
      return { allowed: false, hint: 'Could not verify current user profile. Please log in again.' }
    }
    const userRecord = (await profileRes.json()) as { email?: string }
    const userEmail = userRecord?.email?.toLowerCase?.().trim() || ''
    const adminEmails = getAdminEmails().map((e: string) => e.toLowerCase().trim())
    const allowed = !!userEmail && adminEmails.includes(userEmail)
    return {
      allowed,
      hint: !allowed && userEmail
        ? `Only ${adminEmails.join(', ')} can access this page.`
        : undefined,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Admin check error:', e)
    const hint = `Admin check failed. ${msg.slice(0, 200)}`
    return { allowed: false, hint }
  }
})
