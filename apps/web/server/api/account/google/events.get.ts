import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { hasStoredGoogleCalendarScope } from '~/server/utils/googleOauth'
import { getUserDefaultGoogleAccessToken, parseDashboardCalendars } from '~/server/utils/userGoogleAccess'
import { requireWorkspaceGoogleOwnerId } from '~/server/utils/workspace'

function eventStartMs(start: string): number {
  if (!start) return 0
  if (start.includes('T')) return new Date(start).getTime() || 0
  return new Date(`${start}T12:00:00`).getTime() || 0
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)

  const googleOwnerId = await requireWorkspaceGoogleOwnerId(pb, userId)
  const { accessToken, json } = await getUserDefaultGoogleAccessToken(pb, googleOwnerId)
  const scope = json.google?.scope ?? ''
  if (!hasStoredGoogleCalendarScope(scope)) {
    throw createError({ statusCode: 400, message: 'Calendar scope not granted. Reconnect Google under Account.' })
  }

  const calendarEntries = parseDashboardCalendars(json)
  if (!calendarEntries.length) {
    throw createError({ statusCode: 400, message: 'Choose one or more calendars under Account.' })
  }

  const query = getQuery(event)
  const timeMin = typeof query.timeMin === 'string' && query.timeMin.trim() ? query.timeMin : new Date().toISOString()
  const timeMax = typeof query.timeMax === 'string' && query.timeMax.trim() ? query.timeMax : ''
  const maxResults = Math.min(1000, Math.max(1, parseInt(String(query.maxResults ?? '200'), 10) || 200))

  const n = calendarEntries.length
  const perCal = Math.min(25, Math.max(3, Math.ceil(maxResults / n)))

  const entryById = new Map(calendarEntries.map((c) => [c.id, c]))

  type RawEvent = {
    id?: string
    summary?: string
    htmlLink?: string
    start?: { dateTime?: string; date?: string }
    end?: { dateTime?: string; date?: string }
  }

  const merged: Array<{
    id: string
    summary: string
    htmlLink?: string
    start: string
    end: string
    calendarId: string
    calendarLabel: string
    calendarColor?: string
  }> = []

  for (const { id: calId } of calendarEntries) {
    const entry = entryById.get(calId)
    const label = entry?.summary ?? calId

    let pageToken = ''
    let fetchedForCalendar = 0
    while (fetchedForCalendar < perCal) {
      const calEnc = encodeURIComponent(calId)
      const params = new URLSearchParams({
        timeMin,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: String(Math.min(250, perCal - fetchedForCalendar)),
      })
      if (timeMax) params.set('timeMax', timeMax)
      if (pageToken) params.set('pageToken', pageToken)

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calEnc}/events?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) {
        const text = await res.text()
        throw createError({ statusCode: res.status, message: `Calendar API: ${res.status} ${text}` })
      }
      const data = (await res.json()) as { items?: RawEvent[]; nextPageToken?: string }
      const items = data.items ?? []
      for (const e of items) {
        const eid = e.id ?? ''
        merged.push({
          id: eid ? `${calId}::${eid}` : `${calId}::${merged.length}`,
          summary: e.summary ?? '(No title)',
          htmlLink: e.htmlLink,
          start: e.start?.dateTime ?? e.start?.date ?? '',
          end: e.end?.dateTime ?? e.end?.date ?? '',
          calendarId: calId,
          calendarLabel: label,
          calendarColor: entry?.color,
        })
      }
      fetchedForCalendar += items.length
      if (!data.nextPageToken || !items.length) break
      pageToken = data.nextPageToken
    }
  }

  merged.sort((a, b) => eventStartMs(a.start) - eventStartMs(b.start))
  const events = merged.slice(0, maxResults)

  return { calendarIds: calendarEntries.map((c) => c.id), events, timeMin, timeMax }
})
