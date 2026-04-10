import type PocketBase from 'pocketbase'
import { sendTransactionalEmail } from '~/server/utils/sendTransactionalEmail'
import { emailFailureUserMessage } from '~/server/utils/emailFailureUserMessage'
import { signInvitePasswordToken } from '~/server/utils/invitePasswordToken'

export type MemberInviteEmailResult = { ok: true; emailSent: true } | { ok: true; emailSent: false; warning: string }

/**
 * Sends one transactional “agency member invite” email with a signed link to set a password (no separate PocketBase reset email).
 */
export async function sendAgencyMemberInviteEmails(
  pb: PocketBase,
  opts: {
    ownerUserId: string
    memberUserId: string
    memberEmail: string
    memberDisplayName: string
  },
): Promise<MemberInviteEmailResult> {
  const { ownerUserId, memberUserId, memberEmail, memberDisplayName } = opts
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
  const loginUrl = `${appUrl}/auth/login?invited=1&email=${enc}`
  let appName = 'Web Ranking Reports'
  try {
    const s = (await pb.settings.getAll()) as { meta?: { appName?: string } }
    if (s.meta?.appName) appName = s.meta.appName
  } catch {
    // ignore
  }

  try {
    const inviteToken = signInvitePasswordToken(memberUserId, email)
    const setPasswordUrl = `${appUrl}/auth/invite-set-password?t=${encodeURIComponent(inviteToken)}`
    await sendTransactionalEmail(pb, 'agency_member_invite', email, {
      APP_NAME: appName,
      APP_URL: appUrl,
      INVITE_URL: setPasswordUrl,
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
 * Last successful auth time from a PocketBase `users` record (admin / SDK may use camelCase or snake_case;
 * value may be an ISO string or a Date).
 */
export function lastLoginIsoFromRecord(record: Record<string, unknown>): string {
  const raw =
    record.lastLogin ??
    record.last_login ??
    record.LastLogin ??
    record['lastLogin'] ??
    record['last_login']
  if (raw == null || raw === '') return ''
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (!t || t.startsWith('0001-01-01')) return ''
    return t
  }
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? '' : raw.toISOString()
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? '' : d.toISOString()
  }
  return ''
}

function pbDateFromValue(v: unknown): Date | null {
  if (v == null || v === '') return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof v === 'string') {
    const t = v.trim()
    if (!t) return null
    const d = new Date(t)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function pbDateFromRecord(record: Record<string, unknown>, keys: string[]): Date | null {
  for (const k of keys) {
    const d = pbDateFromValue(record[k])
    if (d) return d
  }
  return null
}

/**
 * Team member has finished onboarding (show Verified) if:
 * - PocketBase reports a last-login time, or
 * - The auth record was updated noticeably after `invite_email_sent_at` (password set, login, etc.).
 *   Admin API responses often omit `lastLogin`; `updated` still moves when they use the account.
 */
export function memberOnboardedFromRecord(record: Record<string, unknown>): boolean {
  if (lastLoginIsoFromRecord(record)) return true

  const updated = pbDateFromRecord(record, ['updated', 'Updated'])
  const inviteAt = pbDateFromRecord(record, ['invite_email_sent_at', 'inviteEmailSentAt'])
  if (updated && inviteAt && updated.getTime() > inviteAt.getTime() + 2000) {
    return true
  }

  return false
}

/** True while still in “Invited” state (no last login and no post-invite record activity). */
export function memberPendingFromRecord(record: Record<string, unknown>): boolean {
  return !memberOnboardedFromRecord(record)
}
