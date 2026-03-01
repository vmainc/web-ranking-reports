import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Contact point id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const existing = await pb.collection('crm_contact_points').getOne(id)
  if ((existing as { user?: string }).user !== userId) throw createError({ statusCode: 403, message: 'Forbidden' })
  const body = (await readBody(event).catch(() => ({}))) as {
    kind?: 'call' | 'email' | 'meeting' | 'note'
    happened_at?: string
    summary?: string
  }
  const updates: Record<string, unknown> = {}
  if (body?.kind && ['call', 'email', 'meeting', 'note'].includes(body.kind)) updates.kind = body.kind
  if (body?.happened_at !== undefined) updates.happened_at = body.happened_at
  if (body?.summary !== undefined) updates.summary = body.summary ? String(body.summary).trim() : null
  const record = await pb.collection('crm_contact_points').update(id, updates)
  return record
})
