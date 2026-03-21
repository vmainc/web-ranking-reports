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
    const s = await pb.settings.getAll()
    const smtp = (s as { smtp?: { enabled?: boolean; host?: string; port?: number } }).smtp
    const meta = (s as { meta?: { appName?: string; appURL?: string; senderName?: string; senderAddress?: string } }).meta
    return {
      smtpEnabled: !!smtp?.enabled,
      smtpHost: smtp?.host ?? '',
      smtpPort: smtp?.port ?? 0,
      appName: meta?.appName ?? '',
      appURL: meta?.appURL ?? '',
      senderName: meta?.senderName ?? '',
      senderAddress: meta?.senderAddress ?? '',
      settingsWarning: '',
    }
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number }
    const msg = err?.message ?? 'Could not load PocketBase settings (check PB admin credentials on the server).'
    if (import.meta.dev) {
      console.warn('[mailer-status] pb.settings.getAll failed:', msg)
    }
    // Still return 200 so the Emails UI can load; templates use a separate endpoint.
    return {
      smtpEnabled: false,
      smtpHost: '',
      smtpPort: 0,
      appName: '',
      appURL: '',
      senderName: '',
      senderAddress: '',
      settingsWarning: msg,
    }
  }
})
