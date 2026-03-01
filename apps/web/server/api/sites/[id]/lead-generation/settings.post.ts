import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

const KEY = 'lead_gen_settings'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>
  const settings = {
    lighthouseMobile: body.lighthouseMobile !== false,
    lighthouseDesktop: body.lighthouseDesktop !== false,
    competitorsCount: typeof body.competitorsCount === 'number' ? Math.max(0, Math.min(10, body.competitorsCount)) : 3,
    keywordDepth: typeof body.keywordDepth === 'number' ? Math.max(5, Math.min(50, body.keywordDepth)) : 20,
  }
  let value: Record<string, Record<string, unknown>> = {}
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ id: string; value?: Record<string, Record<string, unknown>> }>(`key="${KEY}"`)
    value = row?.value ?? {}
  } catch {}
  value[siteId] = settings
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ id: string }>(`key="${KEY}"`)
    await pb.collection('app_settings').update(row.id, { value: value as unknown as Record<string, unknown> })
  } catch {
    await pb.collection('app_settings').create({ key: KEY, value: value as unknown as Record<string, unknown> })
  }
  return { ok: true }
})
