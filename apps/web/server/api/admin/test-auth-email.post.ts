import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'

const ALLOWED = new Set(['verification', 'password-reset', 'email-change'])

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

  const body = (await readBody(event).catch(() => ({}))) as { to?: string; template?: string }
  const to = typeof body.to === 'string' ? body.to.trim() : ''
  const template = typeof body.template === 'string' ? body.template.trim() : ''
  if (!to || !template) {
    throw createError({ statusCode: 400, message: 'Provide "to" email and "template".' })
  }
  if (!ALLOWED.has(template)) {
    throw createError({ statusCode: 400, message: 'Invalid template. Use verification, password-reset, or email-change.' })
  }

  try {
    await pb.settings.testEmail(to, template)
  } catch (e: unknown) {
    const err = e as { message?: string; response?: { data?: { message?: string } } }
    const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to send test email'
    throw createError({ statusCode: 502, message: String(msg).slice(0, 300) })
  }

  return { ok: true }
})
