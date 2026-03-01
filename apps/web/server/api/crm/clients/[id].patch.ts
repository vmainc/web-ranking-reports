import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Client id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const existing = await pb.collection('crm_clients').getOne(id)
  if ((existing as { user?: string }).user !== userId) throw createError({ statusCode: 403, message: 'Forbidden' })
  const body = (await readBody(event).catch(() => ({}))) as {
    name?: string
    email?: string
    phone?: string
    company?: string
    status?: 'lead' | 'client' | 'archived'
    notes?: string
  }
  const updates: Record<string, unknown> = {}
  if (body?.name !== undefined) updates.name = String(body.name).trim() || (existing as { name: string }).name
  if (body?.email !== undefined) updates.email = body.email ? String(body.email).trim() : null
  if (body?.phone !== undefined) updates.phone = body.phone ? String(body.phone).trim() : null
  if (body?.company !== undefined) updates.company = body.company ? String(body.company).trim() : null
  if (body?.status && ['lead', 'client', 'archived'].includes(body.status)) updates.status = body.status
  if (body?.notes !== undefined) updates.notes = body.notes ? String(body.notes).trim() : null
  const record = await pb.collection('crm_clients').update(id, updates)
  return record
})
