import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

const GOOGLE_ANCHOR = 'google_analytics'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as {
    siteId?: string
    calendar_id?: string
    calendar_summary?: string
  }
  const siteId = body?.siteId
  const calendarId = typeof body?.calendar_id === 'string' ? body.calendar_id.trim() : ''
  const calendarSummary = typeof body?.calendar_summary === 'string' ? body.calendar_summary.trim() : ''

  if (!siteId || !calendarId) {
    throw createError({ statusCode: 400, message: 'siteId and calendar_id required' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const list = await pb.collection('integrations').getFullList<{ id: string; config_json?: Record<string, unknown> }>({
    filter: `site = "${siteId}" && provider = "${GOOGLE_ANCHOR}"`,
  })
  const anchor = list[0]
  if (!anchor) {
    throw createError({ statusCode: 400, message: 'Google not connected for this site.' })
  }

  const config: Record<string, unknown> = {
    ...anchor.config_json,
    calendar_id: calendarId,
    calendar_summary: calendarSummary || calendarId,
  }
  await pb.collection('integrations').update(anchor.id, { config_json: config })

  const gcalList = await pb.collection('integrations').getFullList<{ id: string }>({
    filter: `site = "${siteId}" && provider = "google_calendar"`,
  })
  const gcal = gcalList[0]
  if (gcal) {
    await pb.collection('integrations').update(gcal.id, {
      status: 'connected',
      connected_at: new Date().toISOString(),
      config_json: { linked_to: GOOGLE_ANCHOR },
    })
  }

  return { ok: true }
})
