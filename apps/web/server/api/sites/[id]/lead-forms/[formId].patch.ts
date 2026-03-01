import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const siteId = getRouterParam(event, 'id')
  const formId = getRouterParam(event, 'formId')
  if (!siteId || !formId) throw createError({ statusCode: 400, message: 'Site id and form id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)
  const existing = await pb.collection('lead_forms').getOne(formId)
  if ((existing as { site: string }).site !== siteId) throw createError({ statusCode: 404, message: 'Form not found' })
  const body = (await readBody(event).catch(() => ({}))) as { name?: string; status?: string; fields_json?: unknown[]; conditional_json?: unknown[]; settings_json?: Record<string, unknown> }
  const update: Record<string, unknown> = {}
  if (typeof body?.name === 'string') update.name = body.name.trim()
  if (body?.status === 'draft' || body?.status === 'published') update.status = body.status
  if (Array.isArray(body?.fields_json)) update.fields_json = body.fields_json
  if (Array.isArray(body?.conditional_json)) update.conditional_json = body.conditional_json
  if (body?.settings_json && typeof body.settings_json === 'object') update.settings_json = body.settings_json
  return await pb.collection('lead_forms').update(formId, update)
})
