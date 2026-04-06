import { randomBytes } from 'node:crypto'
import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getWorkspaceContext } from '~/server/utils/workspace'
import { sendAgencyMemberInviteEmails } from '~/server/utils/memberInviteEmail'

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

  const displayName = name || email.split('@')[0]

  const pwd = randomPassword()
  await pb.collection('users').create({
    email,
    emailVisibility: true,
    verified: true,
    name: displayName,
    password: pwd,
    passwordConfirm: pwd,
    agency_owner: userId,
    account_type: 'member',
  })

  return sendAgencyMemberInviteEmails(pb, {
    ownerUserId: userId,
    memberEmail: email,
    memberDisplayName: displayName,
  })
})
