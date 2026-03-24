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
    throw createError({
      statusCode: 400,
      message:
        'Reconnect Google under Account and approve Calendar access. Enable Google Calendar API in Google Cloud if needed.',
    })
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw createError({ statusCode: res.status, message: `Calendar API: ${res.status} ${text}` })
  }
  const data = (await res.json()) as {
    items?: Array<{ id?: string; summary?: string; primary?: boolean; accessRole?: string }>
  }
  const items = data.items ?? []
  const calendars = items
    .filter((c) => c.id)
    .map((c) => ({
      id: c.id as string,
      summary: c.summary ?? c.id ?? '',
      primary: !!c.primary,
      accessRole: c.accessRole,
    }))

  return { calendars }
})
