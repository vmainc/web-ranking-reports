import { randomBytes } from 'node:crypto'
import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, requestUsersPasswordResetEmail } from '~/server/utils/pbServer'
import { getWorkspaceContext } from '~/server/utils/workspace'
import { sendTransactionalEmail } from '~/server/utils/sendTransactionalEmail'
import { emailFailureUserMessage } from '~/server/utils/emailFailureUserMessage'

function randomPassword(): string {
  return `${randomBytes(12).toString('base64url')}Aa1!`
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { email?: string; name?: string }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!email || !email.includes('@')) {
    throw createError({ statusCode: 400, message: 'Valid email is required.' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  const ctx = await getWorkspaceContext(pb, userId)
  if (ctx.role !== 'owner') {
    throw createError({ statusCode: 403, message: 'Only the agency owner can invite team members.' })
  }

  const existing = await pb.collection('users').getFullList({ filter: `email = "${email.replace(/"/g, '\\"')}"`, batch: 1 })
  if (existing.length > 0) {
    throw createError({ statusCode: 400, message: 'A user with this email already exists.' })
  }

  const inviter = await pb.collection('users').getOne<{ name?: string; email?: string }>(userId)
  const inviterName =
    (typeof inviter.name === 'string' && inviter.name) || (typeof inviter.email === 'string' ? inviter.email : 'Agency owner')
  const agencyName =
    (typeof inviter.name === 'string' && inviter.name) ||
    (typeof inviter.email === 'string' ? inviter.email.split('@')[0] : 'Your agency')

  const pwd = randomPassword()
  await pb.collection('users').create({
    email,
    emailVisibility: true,
    verified: true,
    name: name || email.split('@')[0],
    password: pwd,
    passwordConfirm: pwd,
    agency_owner: userId,
    account_type: 'member',
  })

  const config = useRuntimeConfig()
  const appUrl = String(config.public?.appUrl || config.appUrl || 'http://localhost:3000').replace(/\/+$/, '')
  const loginUrl = `${appUrl}/auth/login?invited=1`
  const setPasswordUrl = `${appUrl}/auth/forgot-password?email=${encodeURIComponent(email)}`
  let appName = 'Web Ranking Reports'
  try {
    const s = (await pb.settings.getAll()) as { meta?: { appName?: string } }
    if (s.meta?.appName) appName = s.meta.appName
  } catch {
    // ignore
  }

  try {
    await requestUsersPasswordResetEmail(pb, email)
  } catch {
    // Non-fatal: invite email still explains how to use Forgot password on the login page.
  }

  try {
    await sendTransactionalEmail(pb, 'agency_member_invite', email, {
      APP_NAME: appName,
      APP_URL: appUrl,
      INVITE_URL: loginUrl,
      LOGIN_URL: loginUrl,
      SET_PASSWORD_URL: setPasswordUrl,
      AGENCY_NAME: agencyName,
      MEMBER_NAME: name || email.split('@')[0],
      INVITER_NAME: inviterName,
    })
  } catch (e: unknown) {
    // User already exists in PB; email is best-effort—return 200 so the client isn’t a “failed” request.
    return { ok: true, emailSent: false, warning: emailFailureUserMessage(e, 'member') }
  }

  return { ok: true, emailSent: true }
})
