import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getUserDefaultGoogleAccessToken } from '~/server/utils/userGoogleAccess'

const CAL_SCOPE = 'calendar'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)

  const { accessToken, json } = await getUserDefaultGoogleAccessToken(pb, userId)
  const scope = json.google?.scope ?? ''
  if (!scope.split(/\s+/).some((s) => s.includes(CAL_SCOPE))) {
    throw createError({ statusCode: 400, message: 'Calendar scope not granted. Reconnect Google under Account.' })
  }

  const calendarId = typeof json.calendar_id === 'string' ? json.calendar_id.trim() : ''
  if (!calendarId) {
    throw createError({ statusCode: 400, message: 'Choose a default calendar under Account.' })
  }

  const query = getQuery(event)
  const timeMin = typeof query.timeMin === 'string' && query.timeMin.trim() ? query.timeMin : new Date().toISOString()
  const timeMax =
    typeof query.timeMax === 'string' && query.timeMax.trim()
      ? query.timeMax
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const maxResults = Math.min(50, Math.max(1, parseInt(String(query.maxResults ?? '12'), 10) || 12))

  const calId = encodeURIComponent(calendarId)
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(maxResults),
  })
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw createError({ statusCode: res.status, message: `Calendar API: ${res.status} ${text}` })
  }
  const data = (await res.json()) as {
    items?: Array<{
      id?: string
      summary?: string
      htmlLink?: string
      start?: { dateTime?: string; date?: string }
      end?: { dateTime?: string; date?: string }
    }>
  }
  const items = data.items ?? []
  const events = items.map((e) => ({
    id: e.id ?? '',
    summary: e.summary ?? '(No title)',
    htmlLink: e.htmlLink,
    start: e.start?.dateTime ?? e.start?.date ?? '',
    end: e.end?.dateTime ?? e.end?.date ?? '',
  }))

  return { calendarId, events, timeMin, timeMax }
})
