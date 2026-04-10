import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getWorkspaceContext } from '~/server/utils/workspace'
import { sendAgencyMemberInviteEmails } from '~/server/utils/memberInviteEmail'
import { assertTransactionalSmtpEnvReady } from '~/server/utils/smtpSend'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const ownerId = await getUserIdFromRequest(event)
  if (!ownerId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { userId?: string }
  const targetId = typeof body.userId === 'string' ? body.userId.trim() : ''
  if (!targetId) {
    throw createError({ statusCode: 400, message: 'Missing team member id.' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  const ctx = await getWorkspaceContext(pb, ownerId)
  if (ctx.role !== 'owner') {
    throw createError({ statusCode: 403, message: 'Only the agency owner can resend invites.' })
  }

  assertTransactionalSmtpEnvReady()

  const target = await pb.collection('users').getOne<{
    email?: string
    name?: string
    agency_owner?: string
    account_type?: string
  }>(targetId)

  const ao = typeof target.agency_owner === 'string' ? target.agency_owner : ''
  if (ao !== ownerId) {
    throw createError({ statusCode: 403, message: 'That user is not in your workspace.' })
  }

  const at = typeof target.account_type === 'string' ? target.account_type.toLowerCase() : ''
  if (at !== 'member' && at !== 'agency_member') {
    throw createError({ statusCode: 400, message: 'Resend is only for team members.' })
  }

  const email = typeof target.email === 'string' ? target.email.trim().toLowerCase() : ''
  if (!email) {
    throw createError({ statusCode: 400, message: 'Member has no email address.' })
  }

  const displayName =
    (typeof target.name === 'string' && target.name.trim()) || email.split('@')[0] || email

  const out = await sendAgencyMemberInviteEmails(pb, {
    ownerUserId: ownerId,
    memberUserId: targetId,
    memberEmail: email,
    memberDisplayName: displayName,
  })

  if (out.ok && out.emailSent) {
    try {
      await pb.collection('users').update(targetId, {
        invite_email_sent_at: new Date().toISOString(),
      })
    } catch {
      // invite_email_sent_at optional field
    }
  }

  return out
})
