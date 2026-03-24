import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import type { UserDefaultGoogleJson } from '~/server/utils/userGoogleAccess'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as {
    calendars?: Array<{ id?: string; summary?: string }>
    calendar_id?: string
    calendar_summary?: string
  }

  const cleaned: Array<{ id: string; summary: string }> = []
  const seen = new Set<string>()
  if (Array.isArray(body?.calendars)) {
    for (const x of body.calendars) {
      if (!x || typeof x !== 'object') continue
      const id = typeof x.id === 'string' ? x.id.trim() : ''
      if (!id || seen.has(id)) continue
      seen.add(id)
      const summary = typeof x.summary === 'string' ? x.summary.trim() : ''
      cleaned.push({ id, summary: summary || id })
    }
  } else if (typeof body?.calendar_id === 'string' && body.calendar_id.trim()) {
    const id = body.calendar_id.trim()
    const summary = typeof body.calendar_summary === 'string' ? body.calendar_summary.trim() : ''
    cleaned.push({ id, summary: summary || id })
  }

  const pb = getAdminPb()
  await adminAuth(pb)

  const row = await pb.collection('users').getOne<{ default_google_json?: UserDefaultGoogleJson }>(userId)
  const base = { ...(row?.default_google_json ?? {}) } as UserDefaultGoogleJson
  if (!base.google?.refresh_token && !base.google?.access_token) {
    throw createError({ statusCode: 400, message: 'Connect your default Google account first.' })
  }

  const next: UserDefaultGoogleJson = {
    ...base,
    dashboard_calendars: cleaned,
  }
  delete (next as { calendar_id?: string }).calendar_id
  delete (next as { calendar_summary?: string }).calendar_summary

  await pb.collection('users').update(userId, { default_google_json: next })

  return { ok: true }
})
