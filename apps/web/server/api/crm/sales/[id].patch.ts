import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Sale id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const existing = await pb.collection('crm_sales').getOne(id)
  if ((existing as { user?: string }).user !== userId) throw createError({ statusCode: 403, message: 'Forbidden' })
  const body = (await readBody(event).catch(() => ({}))) as { title?: string; amount?: number; status?: 'open' | 'won' | 'lost'; closed_at?: string | null; notes?: string }
  const updates: Record<string, unknown> = {}
  if (body?.title !== undefined) updates.title = String(body.title).trim() || (existing as { title: string }).title
  if (body?.amount !== undefined) updates.amount = body.amount != null ? Number(body.amount) : null
  if (body?.status && ['open', 'won', 'lost'].includes(body.status)) updates.status = body.status
  if (body?.closed_at !== undefined) updates.closed_at = body.closed_at || null
  if (body?.notes !== undefined) updates.notes = body.notes ? String(body.notes).trim() : null
  const record = await pb.collection('crm_sales').update(id, updates)
  return record
})
