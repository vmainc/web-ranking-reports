import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { hasStoredGoogleCalendarScope } from '~/server/utils/googleOauth'
import { parseDashboardCalendars, parseUserDefaultGoogleJson } from '~/server/utils/userGoogleAccess'
import { requireWorkspaceGoogleOwnerId } from '~/server/utils/workspace'

/** Requires PocketBase `users.default_google_json` (type: JSON). Add it in Admin → Collections → users → New field. */

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)

  const googleOwnerId = await requireWorkspaceGoogleOwnerId(pb, userId)
  const row = await pb.collection('users').getOne<{ default_google_json?: unknown }>(googleOwnerId).catch(() => null)
  const json = parseUserDefaultGoogleJson(row?.default_google_json)
  const google = json.google as { scope?: string; email?: string; access_token?: string; refresh_token?: string } | undefined
  const connected = !!(google && (google.refresh_token || google.access_token))

  const hasCalendarScope = hasStoredGoogleCalendarScope(google?.scope)

  const calendars = connected ? parseDashboardCalendars(json) : []

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
