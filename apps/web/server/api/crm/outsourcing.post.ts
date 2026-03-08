import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const body = (await readBody(event).catch(() => ({}))) as {
    client?: string
    order_date?: string
    service?: string
    order_id?: string
    invoice_id?: string
    currency?: string
    total?: number
    notes?: string
  }
  const clientId = body?.client?.trim()
  const orderDate = body?.order_date?.trim()
  const service = body?.service?.trim()
  const total = body?.total != null ? Number(body.total) : undefined

  if (!clientId) throw createError({ statusCode: 400, message: 'Client is required' })
  if (!orderDate) throw createError({ statusCode: 400, message: 'Order date is required' })
  if (!service) throw createError({ statusCode: 400, message: 'Service is required' })
  if (total == null || Number.isNaN(total)) throw createError({ statusCode: 400, message: 'Total is required' })

  const clientRecord = await pb.collection('crm_clients').getOne(clientId)
  if ((clientRecord as { user?: string }).user !== userId) throw createError({ statusCode: 403, message: 'Forbidden' })

  const record = await pb.collection('crm_outsourcing').create({
    user: userId,
    client: clientId,
    order_date: orderDate,
    service,
    order_id: body?.order_id?.trim() || null,
    invoice_id: body?.invoice_id?.trim() || null,
    currency: body?.currency?.trim() || 'USD',
    total,
    notes: body?.notes?.trim() || null,
  })
  return record
})
