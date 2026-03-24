import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

const GOOGLE_ANCHOR = 'google_analytics'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { siteId?: string }
  const siteId = body?.siteId
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

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

  const config = { ...(anchor.config_json ?? {}) } as Record<string, unknown>
  delete config.calendar_id
  delete config.calendar_summary
  await pb.collection('integrations').update(anchor.id, { config_json: config })

  const gcalList = await pb.collection('integrations').getFullList<{ id: string; config_json?: Record<string, unknown> }>({
    filter: `site = "${siteId}" && provider = "google_calendar"`,
  })
  const gcalIntegration = gcalList[0]
  if (gcalIntegration) {
    await pb.collection('integrations').update(gcalIntegration.id, {
      status: 'disconnected',
      connected_at: null,
      config_json: { ...(gcalIntegration.config_json ?? {}), linked_to: GOOGLE_ANCHOR },
    })
  }

  return { ok: true }
})
