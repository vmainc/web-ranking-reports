import { randomBytes } from 'node:crypto'
import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getWorkspaceContext } from '~/server/utils/workspace'
import { sendAgencyMemberInviteEmails } from '~/server/utils/memberInviteEmail'
import { assertTransactionalSmtpEnvReady } from '~/server/utils/smtpSend'

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

  assertTransactionalSmtpEnvReady()

  const existing = await pb.collection('users').getFullList({ filter: `email = "${email.replace(/"/g, '\\"')}"`, batch: 1 })
  if (existing.length > 0) {
    throw createError({ statusCode: 400, message: 'A user with this email already exists.' })
  }

  const displayName = name || email.split('@')[0]

  const pwd = randomPassword()
  const created = await pb.collection('users').create<{ id: string }>({
    email,
    emailVisibility: true,
    verified: true,
    name: displayName,
    password: pwd,
    passwordConfirm: pwd,
    agency_owner: userId,
    account_type: 'member',
  })

  const out = await sendAgencyMemberInviteEmails(pb, {
    ownerUserId: userId,
    memberUserId: created.id,
    memberEmail: email,
    memberDisplayName: displayName,
  })

  let inviteEmailSentAt = ''
  if (out.ok && out.emailSent && created?.id) {
    inviteEmailSentAt = new Date().toISOString()
    try {
      await pb.collection('users').update(created.id, {
        invite_email_sent_at: inviteEmailSentAt,
      })
    } catch {
      // Field missing until migration: add-workspace-schema.mjs (invite_email_sent_at)
    }
  }

  const createdAt =
    created && typeof (created as { created?: string }).created === 'string'
      ? (created as { created: string }).created
      : new Date().toISOString()

  return {
    ...out,
    member: {
      id: created.id,
      email,
      name: displayName,
      created: createdAt,
      inviteEmailSentAt,
      lastLogin: '',
      pending: true as const,
    },
  }
})
