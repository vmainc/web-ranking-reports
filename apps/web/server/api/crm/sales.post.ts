import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const body = (await readBody(event).catch(() => ({}))) as {
    client?: string
    title?: string
    amount?: number
    status?: 'open' | 'won' | 'lost'
    closed_at?: string
    notes?: string
  }
  const client = body?.client?.trim()
  const title = body?.title?.trim() ?? ''
  if (!client) throw createError({ statusCode: 400, message: 'Client is required' })
  if (!title) throw createError({ statusCode: 400, message: 'Title is required' })
  const clientRecord = await pb.collection('crm_clients').getOne(client)
  if ((clientRecord as { user?: string }).user !== userId) throw createError({ statusCode: 403, message: 'Forbidden' })
  const status = body?.status && ['open', 'won', 'lost'].includes(body.status) ? body.status : 'open'
  const record = await pb.collection('crm_sales').create({
    user: userId,
    client,
    title,
    amount: body?.amount != null ? Number(body.amount) : null,
    status,
    closed_at: body?.closed_at || null,
    notes: body?.notes?.trim() || null,
  })
  return record
})
