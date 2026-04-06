import type PocketBase from 'pocketbase'
import { requestUsersPasswordResetEmail } from '~/server/utils/pbServer'
import { sendTransactionalEmail } from '~/server/utils/sendTransactionalEmail'
import { emailFailureUserMessage } from '~/server/utils/emailFailureUserMessage'

export type MemberInviteEmailResult = { ok: true; emailSent: true } | { ok: true; emailSent: false; warning: string }

/**
 * Sends PocketBase password-reset + transactional “agency member invite” to an existing member email.
 */
export async function sendAgencyMemberInviteEmails(
  pb: PocketBase,
  opts: {
    ownerUserId: string
    memberEmail: string
    memberDisplayName: string
  },
): Promise<MemberInviteEmailResult> {
  const { ownerUserId, memberEmail, memberDisplayName } = opts
  const email = memberEmail.trim().toLowerCase()

  const inviter = await pb.collection('users').getOne<{ name?: string; email?: string }>(ownerUserId)
  const inviterName =
    (typeof inviter.name === 'string' && inviter.name) || (typeof inviter.email === 'string' ? inviter.email : 'Agency owner')
  const agencyName =
    (typeof inviter.name === 'string' && inviter.name) ||
    (typeof inviter.email === 'string' ? inviter.email.split('@')[0] : 'Your agency')

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
    // Non-fatal
  }

  try {
    await sendTransactionalEmail(pb, 'agency_member_invite', email, {
      APP_NAME: appName,
      APP_URL: appUrl,
      INVITE_URL: loginUrl,
      LOGIN_URL: loginUrl,
      SET_PASSWORD_URL: setPasswordUrl,
      AGENCY_NAME: agencyName,
      MEMBER_NAME: memberDisplayName,
      INVITER_NAME: inviterName,
    })
  } catch (e: unknown) {
    return { ok: true, emailSent: false, warning: emailFailureUserMessage(e, 'member') }
  }

  return { ok: true, emailSent: true }
}

/** PocketBase auth records expose last login when the user has signed in at least once. */
export function memberPendingFromRecord(record: { lastLogin?: string; last_login?: string }): boolean {
  const last = (record.lastLogin ?? record.last_login ?? '').trim()
  return !last
}
