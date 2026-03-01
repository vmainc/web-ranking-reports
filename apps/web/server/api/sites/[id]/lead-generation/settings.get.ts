import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

const KEY = 'lead_gen_settings'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value?: Record<string, Record<string, unknown>> }>(`key="${KEY}"`)
    const settings = row?.value?.[siteId] ?? null
    return { settings }
  } catch {
    return { settings: null }
  }
})
