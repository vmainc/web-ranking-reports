import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { clearCacheForSite } from '~/server/utils/ga4Helpers'

const GOOGLE_PROVIDERS = ['google_analytics', 'google_search_console']

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  }

  const userId = await getUserIdFromRequest(event)
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event).catch(() => ({})) as { siteId?: string }
  const siteId = body?.siteId
  if (!siteId) {
    throw createError({ statusCode: 400, message: 'siteId required' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const list = await pb.collection('integrations').getFullList<{ id: string; provider: string }>({
    filter: `site = "${siteId}"`,
  })
  const toDisconnect = list.filter((r) => GOOGLE_PROVIDERS.includes(r.provider as 'google_analytics' | 'google_search_console'))

  for (const rec of toDisconnect) {
    const clearConfig = rec.provider === 'google_analytics' ? {} : { linked_to: 'google_analytics' }
    await pb.collection('integrations').update(rec.id, {
      status: 'disconnected',
      connected_at: null,
      config_json: clearConfig,
    })
  }

  clearCacheForSite(siteId)

  return { ok: true }
})
