import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import {
  ensureDefaultPipelineStages,
  publicPipelineStage,
  slugifyPipelineKey,
} from '~/server/services/crm/pipelineStages'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const ownerId = await requireCrmOwnerId(pb, userId)
  const method = event.method

  if (method === 'GET') {
    const stages = await ensureDefaultPipelineStages(pb, ownerId)
    return { stages: stages.map(publicPipelineStage) }
  }

  if (method === 'POST') {
    const body = await readBody<{ label?: string }>(event)
    const label = String(body?.label || '').trim()
    if (!label) throw createError({ statusCode: 400, message: 'Column title is required' })

    const existing = await ensureDefaultPipelineStages(pb, ownerId)
    const maxOrder = existing.reduce((m, s) => Math.max(m, s.sort_order ?? 0), -1)
    let key = slugifyPipelineKey(label)
    const used = new Set(existing.map((s) => s.key))
    if (used.has(key)) {
      let i = 2
      while (used.has(`${key}_${i}`)) i += 1
      key = `${key}_${i}`
    }

    const row = await pb.collection('crm_pipeline_stages').create({
      user: ownerId,
      key,
      label,
      sort_order: maxOrder + 1,
      is_default: false,
    })
    const stages = await ensureDefaultPipelineStages(pb, ownerId)
    return { stage: publicPipelineStage(row as typeof stages[number]), stages: stages.map(publicPipelineStage) }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
