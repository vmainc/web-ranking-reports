import { randomBytes } from 'node:crypto'
import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getWorkspaceContext } from '~/server/utils/workspace'
import {
  lastLoginIsoFromRecord,
  memberPendingFromRecord,
  sendAgencyMemberInviteEmails,
} from '~/server/utils/memberInviteEmail'
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

  const existing = await pb.collection('users').getFullList<{
    id: string
    email?: string
    name?: string
    created?: string
    invite_email_sent_at?: string
    agency_owner?: string
    account_type?: string
    lastLogin?: string
    last_login?: string
  }>({ filter: `email = "${email.replace(/"/g, '\\"')}"`, batch: 1 })

  if (existing.length > 0) {
    const row = existing[0]
    const ao = typeof row.agency_owner === 'string' ? row.agency_owner : ''
    const at = typeof row.account_type === 'string' ? row.account_type.toLowerCase() : ''
    const isOurTeamMember = ao === userId && (at === 'member' || at === 'agency_member')
    /** First invite may have created the user but failed email (e.g. missing STATE_SIGNING_SECRET). Re-submit must resend, not 400. */
    if (isOurTeamMember) {
      const displayName =
        (typeof row.name === 'string' && row.name.trim()) || email.split('@')[0] || email
      const out = await sendAgencyMemberInviteEmails(pb, {
        ownerUserId: userId,
        memberUserId: row.id,
        memberEmail: email,
        memberDisplayName: displayName,
      })
      let inviteEmailSentAt = ''
      if (out.ok && out.emailSent && row.id) {
        inviteEmailSentAt = new Date().toISOString()
        try {
          await pb.collection('users').update(row.id, { invite_email_sent_at: inviteEmailSentAt })
        } catch {
          // invite_email_sent_at optional field
        }
      } else if (typeof row.invite_email_sent_at === 'string' && row.invite_email_sent_at) {
        inviteEmailSentAt = row.invite_email_sent_at
      }
      const rec = row as Record<string, unknown>
      return {
        ...out,
        member: {
          id: row.id,
          email,
          name: displayName,
          created: typeof row.created === 'string' ? row.created : new Date().toISOString(),
          inviteEmailSentAt,
          lastLogin: lastLoginIsoFromRecord(rec),
          pending: memberPendingFromRecord(rec),
        },
      }
    }
    throw createError({
      statusCode: 400,
      message: 'A user with this email already exists (not as your team member). Use another address or manage them in PocketBase.',
    })
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
