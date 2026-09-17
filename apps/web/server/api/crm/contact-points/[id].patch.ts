import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { crmRowOwnedByUser, requireCrmOwnerId } from '~/server/utils/workspace'

const ALLOWED_KINDS = [
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
] as const

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Contact point id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const existing = await pb.collection('crm_contact_points').getOne(id)
  if (!crmRowOwnedByUser(existing as { user?: unknown }, crmOwnerId)) throw createError({ statusCode: 403, message: 'Forbidden' })
  const body = (await readBody(event).catch(() => ({}))) as {
    kind?: string
    happened_at?: string
    summary?: string | null
  }
  const updates: Record<string, unknown> = {}
  if (body?.kind && ALLOWED_KINDS.includes(body.kind as (typeof ALLOWED_KINDS)[number])) updates.kind = body.kind
  if (body?.happened_at !== undefined) {
    const happenedAt = String(body.happened_at).trim()
    if (!happenedAt) throw createError({ statusCode: 400, message: 'Date (happened_at) is required' })
    updates.happened_at = happenedAt
  }
  if (body?.summary !== undefined) updates.summary = body.summary ? String(body.summary).trim() : null
  const record = await pb.collection('crm_contact_points').update(id, updates)
  if (typeof updates.happened_at === 'string' && existing.client) {
    await pb.collection('crm_clients').update(String(existing.client), { last_activity_at: updates.happened_at }).catch(() => {})
  }
  return record
})
