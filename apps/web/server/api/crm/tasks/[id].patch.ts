import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Task id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const existing = await pb.collection('crm_tasks').getOne(id)
  if ((existing as { user?: string }).user !== userId) throw createError({ statusCode: 403, message: 'Forbidden' })
  const body = (await readBody(event).catch(() => ({}))) as {
    title?: string
    due_at?: string
    priority?: 'low' | 'med' | 'high'
    status?: 'open' | 'done'
    notes?: string
  }
  const updates: Record<string, unknown> = {}
  if (body?.title !== undefined) updates.title = String(body.title).trim() || (existing as { title: string }).title
  if (body?.due_at !== undefined) updates.due_at = body.due_at || (existing as { due_at: string }).due_at
  if (body?.priority && ['low', 'med', 'high'].includes(body.priority)) updates.priority = body.priority
  if (body?.status && ['open', 'done'].includes(body.status)) updates.status = body.status
  if (body?.notes !== undefined) updates.notes = body.notes ? String(body.notes).trim() : null
  if (Object.keys(updates).length === 0) return existing
  const record = await pb.collection('crm_tasks').update(id, updates)
  return record
})
