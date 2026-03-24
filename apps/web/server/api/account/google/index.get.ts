import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

/** Requires PocketBase `users.default_google_json` (type: JSON). Add it in Admin → Collections → users → New field. */

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)

  const row = await pb.collection('users').getOne<{ default_google_json?: Record<string, unknown> }>(userId).catch(() => null)
  const json = row?.default_google_json ?? {}
  const google = json.google as { scope?: string; email?: string; access_token?: string; refresh_token?: string } | undefined
  const connected = !!(google && (google.refresh_token || google.access_token))

  const scopes = (google?.scope ?? '').split(/\s+/)
  const hasCalendarScope = scopes.some((s) => s.includes('calendar'))

  const calendarId = typeof json.calendar_id === 'string' ? json.calendar_id.trim() : ''
  const calendarSummary = typeof json.calendar_summary === 'string' ? json.calendar_summary : ''

  return {
    connected,
    email: google?.email ?? null,
    hasCalendarScope,
    calendar:
      hasCalendarScope && calendarId
        ? { id: calendarId, summary: calendarSummary || calendarId }
        : null,
  }
})
