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
    pipeline_stage?: string
    source?: string
    next_step?: string
    mailing_address_line1?: string | null
    mailing_address_line2?: string | null
    mailing_city?: string | null
    mailing_state?: string | null
    mailing_postal_code?: string | null
    mailing_country?: string | null
    last_activity_at?: string | null
    tags_json?: string[] | null
    site?: string | null
  }
  const updates: Record<string, unknown> = {}
  if (body?.name !== undefined) updates.name = String(body.name).trim() || (existing as { name: string }).name
  if (body?.email !== undefined) updates.email = body.email ? String(body.email).trim() : null
  if (body?.phone !== undefined) updates.phone = body.phone ? String(body.phone).trim() : null
  if (body?.company !== undefined) updates.company = body.company ? String(body.company).trim() : null
  if (body?.status && ['lead', 'client', 'archived'].includes(body.status)) updates.status = body.status
  if (body?.notes !== undefined) updates.notes = body.notes ? String(body.notes).trim() : null
  if (body?.source !== undefined) updates.source = body.source ? String(body.source).trim() : null
  if (body?.next_step !== undefined) updates.next_step = body.next_step ? String(body.next_step).trim() : null
  if (body?.mailing_address_line1 !== undefined) updates.mailing_address_line1 = body.mailing_address_line1 ? String(body.mailing_address_line1).trim() : null
  if (body?.mailing_address_line2 !== undefined) updates.mailing_address_line2 = body.mailing_address_line2 ? String(body.mailing_address_line2).trim() : null
  if (body?.mailing_city !== undefined) updates.mailing_city = body.mailing_city ? String(body.mailing_city).trim() : null
  if (body?.mailing_state !== undefined) updates.mailing_state = body.mailing_state ? String(body.mailing_state).trim() : null
  if (body?.mailing_postal_code !== undefined) updates.mailing_postal_code = body.mailing_postal_code ? String(body.mailing_postal_code).trim() : null
  if (body?.mailing_country !== undefined) updates.mailing_country = body.mailing_country ? String(body.mailing_country).trim() : null
  if (body?.last_activity_at !== undefined) updates.last_activity_at = body.last_activity_at || null
  if (body?.tags_json !== undefined) updates.tags_json = Array.isArray(body.tags_json) ? body.tags_json : null

  const pipelineStage = body?.pipeline_stage && ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'].includes(body.pipeline_stage) ? body.pipeline_stage : undefined
  const prevStage = (existing as { pipeline_stage?: string }).pipeline_stage ?? 'new'
  if (pipelineStage !== undefined) updates.pipeline_stage = pipelineStage

  if (body?.site !== undefined) {
    const siteId = body.site && String(body.site).trim() ? String(body.site).trim() : null
    if (siteId) {
      const siteRecord = await pb.collection('sites').getOne(siteId).catch(() => null)
      if (!siteRecord || (siteRecord as { user?: string }).user !== userId) throw createError({ statusCode: 403, message: 'Site not found or access denied' })
    }
    updates.site = siteId
  }

  const record = await pb.collection('crm_clients').update(id, updates)

  if (pipelineStage !== undefined && pipelineStage !== prevStage) {
    await pb.collection('crm_contact_points').create({
      user: userId,
      client: id,
      kind: 'note',
      happened_at: new Date().toISOString(),
      summary: `Stage changed: ${prevStage} → ${pipelineStage}`,
    })
  }
  return record
})
