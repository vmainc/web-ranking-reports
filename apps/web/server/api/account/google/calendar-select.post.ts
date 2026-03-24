import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import type { UserDefaultGoogleJson } from '~/server/utils/userGoogleAccess'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as {
    calendar_id?: string
    calendar_summary?: string
  }
  const calendarId = typeof body?.calendar_id === 'string' ? body.calendar_id.trim() : ''
  const calendarSummary = typeof body?.calendar_summary === 'string' ? body.calendar_summary.trim() : ''

  if (!calendarId) throw createError({ statusCode: 400, message: 'calendar_id required' })

  const pb = getAdminPb()
  await adminAuth(pb)

  const row = await pb.collection('users').getOne<{ default_google_json?: UserDefaultGoogleJson }>(userId)
  const base = { ...(row?.default_google_json ?? {}) } as UserDefaultGoogleJson
  if (!base.google?.refresh_token && !base.google?.access_token) {
    throw createError({ statusCode: 400, message: 'Connect your default Google account first.' })
  }

  const next: UserDefaultGoogleJson = {
    ...base,
    calendar_id: calendarId,
    calendar_summary: calendarSummary || calendarId,
  }
  await pb.collection('users').update(userId, { default_google_json: next })

  return { ok: true }
})
