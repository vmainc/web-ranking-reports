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
  const enc = encodeURIComponent(email)
  /** Primary link: password-setup page (prefills email; can auto-request reset link). Not plain login. */
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
    await sendTransactionalEmail(pb, 'agency_member_invite', email, {
      APP_NAME: appName,
      APP_URL: appUrl,
      INVITE_URL: passwordSetupUrl,
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

/**
 * True until the user has signed in at least once (PocketBase sets last login after first auth).
 * Handles camelCase / snake_case and stringified values from the Admin API.
 */
export function memberPendingFromRecord(record: Record<string, unknown>): boolean {
  const raw =
    record.lastLogin ??
    record.last_login ??
    record.LastLogin ??
    record['lastLogin'] ??
    record['last_login']
  const last = typeof raw === 'string' ? raw.trim() : ''
  if (!last) return true
  // Zero / sentinel times from some exports
  if (last.startsWith('0001-01-01')) return true
  return false
}
