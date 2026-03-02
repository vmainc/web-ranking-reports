import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
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
    tags_json?: string[]
  }
  const name = body?.name?.trim() ?? ''
  if (!name) throw createError({ statusCode: 400, message: 'Name is required' })
  const status = body?.status && ['lead', 'client', 'archived'].includes(body.status) ? body.status : 'lead'
  const pipelineStage = body?.pipeline_stage && ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'].includes(body.pipeline_stage) ? body.pipeline_stage : 'new'
  const record = await pb.collection('crm_clients').create({
    user: userId,
    name,
    email: body?.email?.trim() || null,
    phone: body?.phone?.trim() || null,
    company: body?.company?.trim() || null,
    status,
    notes: body?.notes?.trim() || null,
    pipeline_stage: pipelineStage,
    source: body?.source?.trim() || null,
    next_step: body?.next_step?.trim() || null,
    tags_json: Array.isArray(body?.tags_json) ? body.tags_json : null,
  })
  return record
})
