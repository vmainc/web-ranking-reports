import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

const KEY = 'google_ads_settings'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const body = (await readBody(event).catch(() => ({}))) as { hiddenCampaigns?: unknown }
  const hiddenCampaigns = Array.isArray(body.hiddenCampaigns)
    ? (body.hiddenCampaigns.filter((c) => typeof c === 'string') as string[])
    : []

  let value: Record<string, { hiddenCampaigns?: string[] }> = {}
  try {
    const row = await pb
      .collection('app_settings')
      .getFirstListItem<{ id: string; value?: Record<string, { hiddenCampaigns?: string[] }> }>(`key="${KEY}"`)
    value = row?.value ?? {}
  } catch {
    // no existing row, will create below
  }

  value[siteId] = { hiddenCampaigns }

  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ id: string }>(`key="${KEY}"`)
    await pb.collection('app_settings').update(row.id, { value })
  } catch {
    await pb.collection('app_settings').create({ key: KEY, value })
  }

  return { ok: true }
})

