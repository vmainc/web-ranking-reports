import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'
import { getAuthUsersCollection } from '~/server/utils/authCollection'

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

  const body = (await readBody(event).catch(() => ({}))) as {
    verification?: { subject?: string; body?: string }
    passwordReset?: { subject?: string; body?: string }
    emailChange?: { subject?: string; body?: string }
  }

  const col = await getAuthUsersCollection(pb)
  if (!col?.id) {
    throw createError({ statusCode: 503, message: 'Could not find an auth collection (expected name "users").' })
  }

  const prev = col.options && typeof col.options === 'object' ? { ...col.options } : {}

  const pick = (t: { subject?: string; body?: string } | undefined) => ({
    subject: typeof t?.subject === 'string' ? t.subject : '',
    body: typeof t?.body === 'string' ? t.body : '',
  })

  if (body.verification !== undefined) prev.verificationTemplate = pick(body.verification)
  if (body.passwordReset !== undefined) prev.resetPasswordTemplate = pick(body.passwordReset)
  if (body.emailChange !== undefined) prev.confirmEmailChangeTemplate = pick(body.emailChange)

  await pb.collections.update(col.id, { options: prev })

  return { ok: true }
})
