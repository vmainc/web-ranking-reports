import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getUserDefaultGoogleAccessToken, parseDashboardCalendars } from '~/server/utils/userGoogleAccess'

const CAL_SCOPE = 'calendar'

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

  const { accessToken, json } = await getUserDefaultGoogleAccessToken(pb, userId)
  const scope = json.google?.scope ?? ''
  if (!scope.split(/\s+/).some((s) => s.includes(CAL_SCOPE))) {
    throw createError({ statusCode: 400, message: 'Calendar scope not granted. Reconnect Google under Account.' })
  }

  const calendarEntries = parseDashboardCalendars(json)
  if (!calendarEntries.length) {
    throw createError({ statusCode: 400, message: 'Choose one or more calendars under Account.' })
  }

  const query = getQuery(event)
  const timeMin = typeof query.timeMin === 'string' && query.timeMin.trim() ? query.timeMin : new Date().toISOString()
  const timeMax =
    typeof query.timeMax === 'string' && query.timeMax.trim()
      ? query.timeMax
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const maxResults = Math.min(50, Math.max(1, parseInt(String(query.maxResults ?? '12'), 10) || 12))

  const n = calendarEntries.length
  const perCal = Math.min(25, Math.max(3, Math.ceil(maxResults / n)))

  const summaryById = new Map(calendarEntries.map((c) => [c.id, c.summary]))

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
  }> = []

  for (const { id: calId } of calendarEntries) {
    const calEnc = encodeURIComponent(calId)
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: String(perCal),
    })
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calEnc}/events?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      const text = await res.text()
      throw createError({ statusCode: res.status, message: `Calendar API: ${res.status} ${text}` })
    }
    const data = (await res.json()) as { items?: RawEvent[] }
    const items = data.items ?? []
    const label = summaryById.get(calId) ?? calId
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
      })
    }
  }

  merged.sort((a, b) => eventStartMs(a.start) - eventStartMs(b.start))
  const events = merged.slice(0, maxResults)

  return { calendarIds: calendarEntries.map((c) => c.id), events, timeMin, timeMax }
})
