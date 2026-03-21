/**
 * Classify app users for Admin → Users.
 *
 * - **admin**: email is in `getAdminEmails()` (ADMIN_EMAILS + defaults).
 * - **client**: invited read-only users — detected via `account_type` / `user_type` / `role` / `kind`
 *   (e.g. `client`, `viewer`, `readonly`) or boolean `is_client` on the user record.
 * - **agency**: default for full app users (agency staff) when not admin/client.
 */

export type AppUserKind = 'admin' | 'agency' | 'client'

export function classifyAppUserKind(
  email: string,
  record: Record<string, unknown>,
  adminEmails: string[],
): AppUserKind {
  const e = email.toLowerCase().trim()
  const adminSet = new Set(adminEmails.map((x) => x.toLowerCase().trim()).filter(Boolean))
  if (e && adminSet.has(e)) return 'admin'

  const pick =
    (typeof record.account_type === 'string' && record.account_type) ||
    (typeof record.user_type === 'string' && record.user_type) ||
    (typeof record.role === 'string' && record.role) ||
    (typeof record.kind === 'string' && record.kind) ||
    ''

  const t = pick.toLowerCase().trim()
  if (t === 'client' || t === 'viewer' || t === 'readonly' || t === 'read_only') return 'client'
  if (t === 'member' || t === 'agency_member') return 'agency'
  if (t === 'agency' || t === 'staff') return 'agency'

  if (record.is_client === true) return 'client'

  return 'agency'
}
