import { getAdminPb, adminAuth, getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'
import { getAuthUsersCollection } from '~/server/utils/authCollection'

export interface EmailTemplatePayload {
  subject: string
  body: string
}

function normalizeTemplate(v: unknown): EmailTemplatePayload {
  if (!v || typeof v !== 'object') return { subject: '', body: '' }
  const o = v as { subject?: string; body?: string }
  return {
    subject: typeof o.subject === 'string' ? o.subject : '',
    body: typeof o.body === 'string' ? o.body : '',
  }
}

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

  const col = await getAuthUsersCollection(pb)
  if (!col?.id) {
    throw createError({ statusCode: 503, message: 'Could not find an auth collection (expected name "users").' })
  }

  const opt = col.options ?? {}
  return {
    collectionId: col.id,
    verification: normalizeTemplate(opt.verificationTemplate),
    passwordReset: normalizeTemplate(opt.resetPasswordTemplate),
    emailChange: normalizeTemplate(opt.confirmEmailChangeTemplate),
  }
})
