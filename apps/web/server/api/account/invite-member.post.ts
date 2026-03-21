import { randomBytes } from 'node:crypto'
import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getWorkspaceContext } from '~/server/utils/workspace'
import { sendTransactionalEmail } from '~/server/utils/sendTransactionalEmail'

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
  let appName = 'Web Ranking Reports'
  try {
    const s = (await pb.settings.getAll()) as { meta?: { appName?: string } }
    if (s.meta?.appName) appName = s.meta.appName
  } catch {
    // ignore
  }

  try {
    await sendTransactionalEmail(pb, 'agency_member_invite', email, {
      APP_NAME: appName,
      APP_URL: appUrl,
      INVITE_URL: `${appUrl}/auth/login`,
      AGENCY_NAME: agencyName,
      MEMBER_NAME: name || email.split('@')[0],
      INVITER_NAME: inviterName,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    throw createError({
      statusCode: 502,
      message: `User was created but email failed to send: ${msg.slice(0, 200)}`,
    })
  }

  return { ok: true }
})
