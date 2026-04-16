import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { crmRowOwnedByUser, requireCrmOwnerId } from '~/server/utils/workspace'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Sale id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const existing = await pb.collection('crm_sales').getOne(id)
  if (!crmRowOwnedByUser(existing as { user?: unknown }, crmOwnerId)) throw createError({ statusCode: 403, message: 'Forbidden' })
  const body = (await readBody(event).catch(() => ({}))) as {
    title?: string
    amount?: number
    status?: 'open' | 'won' | 'lost'
    closed_at?: string | null
    notes?: string
    probability?: number | null
    expected_close_at?: string | null
  }
  const updates: Record<string, unknown> = {}
  if (body?.title !== undefined) updates.title = String(body.title).trim() || (existing as { title: string }).title
  if (body?.amount !== undefined) updates.amount = body.amount != null ? Number(body.amount) : null
  if (body?.status && ['open', 'won', 'lost'].includes(body.status)) updates.status = body.status
  if (body?.closed_at !== undefined) updates.closed_at = body.closed_at || null
  if (body?.notes !== undefined) updates.notes = body.notes ? String(body.notes).trim() : null
  if (body?.probability !== undefined) updates.probability = body.probability != null ? Math.min(100, Math.max(0, Number(body.probability))) : null
  if (body?.expected_close_at !== undefined) updates.expected_close_at = body.expected_close_at || null
  const record = await pb.collection('crm_sales').update(id, updates)
  return record
})
