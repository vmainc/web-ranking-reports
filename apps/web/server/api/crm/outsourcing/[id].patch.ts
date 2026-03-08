import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Outsourcing order id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const existing = await pb.collection('crm_outsourcing').getOne(id)
  if ((existing as { user?: string }).user !== userId) throw createError({ statusCode: 403, message: 'Forbidden' })

  const body = (await readBody(event).catch(() => ({}))) as {
    order_date?: string
    service?: string
    order_id?: string
    invoice_id?: string
    currency?: string
    total?: number
    notes?: string
  }
  const updates: Record<string, unknown> = {}
  if (body?.order_date !== undefined) updates.order_date = body.order_date.trim()
  if (body?.service !== undefined) updates.service = body.service.trim() || (existing as { service: string }).service
  if (body?.order_id !== undefined) updates.order_id = body.order_id?.trim() || null
  if (body?.invoice_id !== undefined) updates.invoice_id = body.invoice_id?.trim() || null
  if (body?.currency !== undefined) updates.currency = body.currency?.trim() || 'USD'
  if (body?.total !== undefined) updates.total = Number(body.total)
  if (body?.notes !== undefined) updates.notes = body.notes?.trim() || null

  const record = await pb.collection('crm_outsourcing').update(id, updates)
  return record
})
