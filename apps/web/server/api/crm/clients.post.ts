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
    name_prefix?: string
    first_name?: string
    last_name?: string
    name?: string
    email?: string
    phone?: string
    business_phone?: string
    cell_phone?: string
    company?: string
    status?: 'lead' | 'client' | 'archived'
    notes?: string
    pipeline_stage?: string
    source?: string
    next_step?: string
    mailing_address_line1?: string
    mailing_address_line2?: string
    mailing_city?: string
    mailing_state?: string
    mailing_postal_code?: string
    mailing_country?: string
    tags_json?: string[]
    site?: string | null
  }
  const name = body?.name?.trim() ?? ''
  if (!name) throw createError({ statusCode: 400, message: 'Name is required' })
  const status = body?.status && ['lead', 'client', 'archived'].includes(body.status) ? body.status : 'lead'
  const pipelineStage = body?.pipeline_stage && ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'].includes(body.pipeline_stage) ? body.pipeline_stage : 'new'
  const siteId = body?.site && String(body.site).trim() ? String(body.site).trim() : null
  if (siteId) {
    const siteRecord = await pb.collection('sites').getOne(siteId).catch(() => null)
    if (!siteRecord || !crmRowOwnedByUser(siteRecord as { user?: unknown }, crmOwnerId)) {
      throw createError({ statusCode: 403, message: 'Site not found or access denied' })
    }
  }
  const record = await pb.collection('crm_clients').create({
    user: crmOwnerId,
    name_prefix: body?.name_prefix?.trim() || null,
    first_name: body?.first_name?.trim() || null,
    last_name: body?.last_name?.trim() || null,
    name,
    email: body?.email?.trim() || null,
    phone: body?.phone?.trim() || null,
    business_phone: body?.business_phone?.trim() || null,
    cell_phone: body?.cell_phone?.trim() || null,
    company: body?.company?.trim() || null,
    status,
    notes: body?.notes?.trim() || null,
    pipeline_stage: pipelineStage,
    site: siteId,
    source: body?.source?.trim() || null,
    next_step: body?.next_step?.trim() || null,
    mailing_address_line1: body?.mailing_address_line1?.trim() || null,
    mailing_address_line2: body?.mailing_address_line2?.trim() || null,
    mailing_city: body?.mailing_city?.trim() || null,
    mailing_state: body?.mailing_state?.trim() || null,
    mailing_postal_code: body?.mailing_postal_code?.trim() || null,
    mailing_country: body?.mailing_country?.trim() || null,
    tags_json: Array.isArray(body?.tags_json) ? body.tags_json : null,
  })
  return record
})
