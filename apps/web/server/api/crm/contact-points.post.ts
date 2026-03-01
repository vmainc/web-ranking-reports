import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const body = (await readBody(event).catch(() => ({}))) as {
    client?: string
    kind?: 'call' | 'email' | 'meeting' | 'note'
    happened_at?: string
    summary?: string
  }
  const client = body?.client?.trim()
  const kind = body?.kind && ['call', 'email', 'meeting', 'note'].includes(body.kind) ? body.kind : 'note'
  const happenedAt = body?.happened_at?.trim()
  if (!client) throw createError({ statusCode: 400, message: 'Client is required' })
  if (!happenedAt) throw createError({ statusCode: 400, message: 'Date (happened_at) is required' })
  const clientRecord = await pb.collection('crm_clients').getOne(client)
  if ((clientRecord as { user?: string }).user !== userId) throw createError({ statusCode: 403, message: 'Forbidden' })
  const record = await pb.collection('crm_contact_points').create({
    user: userId,
    client,
    kind,
    happened_at: happenedAt,
    summary: body?.summary?.trim() || null,
  })
  return record
})
