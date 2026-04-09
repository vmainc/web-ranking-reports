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

  const body = (await readBody(event).catch(() => ({}))) as {
    email?: string
    name?: string
    siteIds?: string[]
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const siteIds = Array.isArray(body.siteIds) ? body.siteIds.filter((x): x is string => typeof x === 'string') : []
  if (!email || !email.includes('@')) {
    throw createError({ statusCode: 400, message: 'Valid email is required.' })
  }
  if (siteIds.length === 0) {
    throw createError({ statusCode: 400, message: 'Select at least one site for this client.' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  const ctx = await getWorkspaceContext(pb, userId)
  if (ctx.role !== 'owner') {
    throw createError({ statusCode: 403, message: 'Only the agency owner can invite clients.' })
  }

  const existing = await pb.collection('users').getFullList({ filter: `email = "${email.replace(/"/g, '\\"')}"`, batch: 1 })
  if (existing.length > 0) {
    throw createError({ statusCode: 400, message: 'A user with this email already exists.' })
  }

  for (const sid of siteIds) {
    const site = await pb.collection('sites').getOne(sid).catch(() => null)
    if (!site || (site as { user?: string }).user !== userId) {
      throw createError({ statusCode: 400, message: 'Invalid site selection.' })
    }
  }

  const inviter = await pb.collection('users').getOne<{ name?: string; email?: string }>(userId)
  const inviterName =
    (typeof inviter.name === 'string' && inviter.name) || (typeof inviter.email === 'string' ? inviter.email : 'Agency owner')
  const agencyName =
    (typeof inviter.name === 'string' && inviter.name) ||
    (typeof inviter.email === 'string' ? inviter.email.split('@')[0] : 'Your agency')

  const pwd = randomPassword()
  const newUser = await pb.collection('users').create<{ id: string }>({
    email,
    emailVisibility: true,
    verified: true,
    name: name || email.split('@')[0],
    password: pwd,
    passwordConfirm: pwd,
    agency_owner: userId,
    account_type: 'client',
  })

  const clientId = newUser.id
  for (const sid of siteIds) {
    await pb.collection('client_site_access').create({
      owner: userId,
      client: clientId,
      site: sid,
    })
  }

  const config = useRuntimeConfig()
  const appUrl = String(config.public?.appUrl || config.appUrl || 'http://localhost:3000').replace(/\/+$/, '')
  const enc = encodeURIComponent(email)
  const passwordSetupUrl = `${appUrl}/auth/forgot-password?email=${enc}&invited=1&autosend=1`
  const loginUrl = `${appUrl}/auth/login?invited=1&email=${enc}`
  const setPasswordUrl = passwordSetupUrl
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
    // Non-fatal
  }

  try {
    await sendTransactionalEmail(pb, 'client_invite', email, {
      APP_NAME: appName,
      APP_URL: appUrl,
      INVITE_URL: passwordSetupUrl,
      LOGIN_URL: loginUrl,
      SET_PASSWORD_URL: setPasswordUrl,
      AGENCY_NAME: agencyName,
      CLIENT_NAME: name || email.split('@')[0],
      INVITER_NAME: inviterName,
    })
  } catch (e: unknown) {
    return { ok: true, id: clientId, emailSent: false, warning: emailFailureUserMessage(e, 'client') }
  }

  try {
    await pb.collection('users').update(clientId, {
      invite_email_sent_at: new Date().toISOString(),
    })
  } catch {
    // invite_email_sent_at optional
  }

  return { ok: true, id: clientId, emailSent: true }
})
