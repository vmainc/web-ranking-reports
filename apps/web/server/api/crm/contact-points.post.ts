import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { crmRowOwnedByUser, requireCrmOwnerId } from '~/server/utils/workspace'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const body = (await readBody(event).catch(() => ({}))) as {
    client?: string
    kind?: string
    happened_at?: string
    summary?: string
  }
  const client = body?.client?.trim()
  const allowedKinds = [
    'call',
    'email',
    'meeting',
    'note',
    'report_sent',
    'proposal_created',
    'proposal_sent',
    'proposal_viewed',
    'proposal_accepted',
    'proposal_declined',
    'proposal_superseded',
  ]
  const kind = body?.kind && allowedKinds.includes(body.kind) ? body.kind : 'note'
  const happenedAt = body?.happened_at?.trim()
  if (!client) throw createError({ statusCode: 400, message: 'Client is required' })
  if (!happenedAt) throw createError({ statusCode: 400, message: 'Date (happened_at) is required' })
  const clientRecord = await pb.collection('crm_clients').getOne(client)
  if (!crmRowOwnedByUser(clientRecord as { user?: unknown }, crmOwnerId)) throw createError({ statusCode: 403, message: 'Forbidden' })
  const record = await pb.collection('crm_contact_points').create({
    user: crmOwnerId,
    client,
    kind,
    happened_at: happenedAt,
    summary: body?.summary?.trim() || null,
  })
  await pb.collection('crm_clients').update(client, { last_activity_at: happenedAt })
  return record
})
