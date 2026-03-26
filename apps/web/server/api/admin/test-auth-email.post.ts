import { readBody } from 'h3'
import { ClientResponseError } from 'pocketbase'
import { getAdminPb, adminAuth, getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'

const ALLOWED = new Set(['verification', 'password-reset', 'email-change'])

const MAX_ERR_LEN = 2000

/** PocketBase returns mailer failures (e.g. SMTP exit status 1) as API errors; surface them clearly. */
function formatPocketBaseMailError(e: unknown): { statusCode: number; message: string } {
  if (e instanceof ClientResponseError) {
    const r = e.response as { message?: string; data?: { message?: string } }
    const msg =
      (typeof r?.message === 'string' && r.message.trim()) ||
      (typeof r?.data?.message === 'string' && r.data.message.trim()) ||
      (typeof e.message === 'string' && e.message.trim()) ||
      'PocketBase could not send the test email (check Mailer / SMTP).'
    const code = e.status >= 400 && e.status < 600 ? e.status : 502
    const hint =
      /exit status|smtp|connection|tls|auth|ECONN/i.test(msg) && !/Mailer/i.test(msg)
        ? `${msg} — Configure SMTP in PocketBase Admin → Settings → Mailer; mail is sent from the PocketBase server (ensure outbound port 587/465 is allowed).`
        : msg
    return { statusCode: code, message: hint.slice(0, MAX_ERR_LEN) }
  }
  const err = e as { message?: string }
  return {
    statusCode: 502,
    message: (err?.message ?? String(e)).slice(0, MAX_ERR_LEN),
  }
}

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
    const { statusCode, message } = formatPocketBaseMailError(e)
    throw createError({ statusCode, message })
  }

  return { ok: true }
})
