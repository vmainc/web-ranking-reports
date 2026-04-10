import { readBody, getMethod } from 'h3'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { verifyInvitePasswordToken } from '~/server/utils/invitePasswordToken'

/**
 * Completes team invite: one email contains a signed link; user posts new password here (no PocketBase reset email).
 */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const body = (await readBody(event).catch(() => ({}))) as {
    token?: string
    password?: string
    passwordConfirm?: string
  }
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const passwordConfirm = typeof body.passwordConfirm === 'string' ? body.passwordConfirm : ''
  if (!token) throw createError({ statusCode: 400, message: 'Missing invite token.' })
  if (password.length < 8) throw createError({ statusCode: 400, message: 'Password must be at least 8 characters.' })
  if (password !== passwordConfirm) throw createError({ statusCode: 400, message: 'Passwords do not match.' })

  const payload = verifyInvitePasswordToken(token)
  if (!payload) {
    throw createError({ statusCode: 400, message: 'This invite link is invalid or has expired. Ask your admin to resend the invite.' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)

  const user = await pb.collection('users').getOne<{
    email?: string
    account_type?: string
    agency_owner?: string
  }>(payload.uid)

  const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : ''
  if (email !== payload.email) {
    throw createError({ statusCode: 400, message: 'This invite link does not match this account.' })
  }

  const at = typeof user.account_type === 'string' ? user.account_type.toLowerCase() : ''
  if (at !== 'member' && at !== 'agency_member') {
    throw createError({ statusCode: 400, message: 'This invite link is only for team member accounts.' })
  }

  await pb.collection('users').update(payload.uid, {
    password,
    passwordConfirm,
  })

  return { ok: true as const }
})
