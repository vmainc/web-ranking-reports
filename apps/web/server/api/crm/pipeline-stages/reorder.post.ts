import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import {
  ensureDefaultPipelineStages,
  listPipelineStages,
  publicPipelineStage,
} from '~/server/services/crm/pipelineStages'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { stageIds?: string[] }
  const stageIds = Array.isArray(body.stageIds) ? body.stageIds.map((id) => String(id || '').trim()).filter(Boolean) : []
  if (stageIds.length < 2) {
    throw createError({ statusCode: 400, message: 'Provide at least two column ids to reorder.' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  const ownerId = await requireCrmOwnerId(pb, userId)
  const existing = await ensureDefaultPipelineStages(pb, ownerId)
  const byId = new Map(existing.map((s) => [s.id, s]))

  if (stageIds.length !== existing.length || stageIds.some((id) => !byId.has(id))) {
    throw createError({ statusCode: 400, message: 'Reorder list must include every Sales column exactly once.' })
  }

  await Promise.all(
    stageIds.map((id, index) =>
      pb.collection('crm_pipeline_stages').update(id, { sort_order: index }),
    ),
  )

  const stages = await listPipelineStages(pb, ownerId)
  return { stages: stages.map(publicPipelineStage) }
})
