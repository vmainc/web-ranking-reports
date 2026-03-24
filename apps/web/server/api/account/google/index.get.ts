import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import type { UserDefaultGoogleJson } from '~/server/utils/userGoogleAccess'
import { parseDashboardCalendars } from '~/server/utils/userGoogleAccess'

/** Requires PocketBase `users.default_google_json` (type: JSON). Add it in Admin → Collections → users → New field. */

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)

  const row = await pb.collection('users').getOne<{ default_google_json?: Record<string, unknown> }>(userId).catch(() => null)
  const json = (row?.default_google_json ?? {}) as UserDefaultGoogleJson
  const google = json.google as { scope?: string; email?: string; access_token?: string; refresh_token?: string } | undefined
  const connected = !!(google && (google.refresh_token || google.access_token))

  const scopes = (google?.scope ?? '').split(/\s+/)
  const hasCalendarScope = scopes.some((s) => s.includes('calendar'))

  const calendars = hasCalendarScope ? parseDashboardCalendars(json) : []

  const calendarSelectionConfigured =
    Array.isArray(json.dashboard_calendars) ||
    (typeof json.calendar_id === 'string' && !!json.calendar_id.trim())

  return {
    connected,
    email: google?.email ?? null,
    hasCalendarScope,
    calendars,
    calendarSelectionConfigured,
  }
})
