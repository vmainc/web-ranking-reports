import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId, escPbFilterId } from '~/server/utils/workspace'
import {
  ensureDefaultPipelineStages,
  listPipelineStages,
  publicPipelineStage,
  type CrmPipelineStageRow,
} from '~/server/services/crm/pipelineStages'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const stageId = getRouterParam(event, 'id')
  if (!stageId) throw createError({ statusCode: 400, message: 'Stage id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const ownerId = await requireCrmOwnerId(pb, userId)
  const method = event.method

  const row = await pb.collection('crm_pipeline_stages').getOne<CrmPipelineStageRow>(stageId)
  if (String(row.user) !== ownerId) throw createError({ statusCode: 403, message: 'Forbidden' })

  if (method === 'PATCH') {
    const body = await readBody<{ label?: string; sortOrder?: number }>(event)
    const patch: Record<string, unknown> = {}
    if (body?.label !== undefined) {
      const label = String(body.label || '').trim()
      if (!label) throw createError({ statusCode: 400, message: 'Column title is required' })
      patch.label = label
    }
    if (typeof body?.sortOrder === 'number' && Number.isFinite(body.sortOrder)) {
      patch.sort_order = Math.round(body.sortOrder)
    }
    if (!Object.keys(patch).length) {
      throw createError({ statusCode: 400, message: 'Nothing to update' })
    }
    const updated = await pb.collection('crm_pipeline_stages').update<CrmPipelineStageRow>(stageId, patch)
    const stages = await listPipelineStages(pb, ownerId)
    return { stage: publicPipelineStage(updated), stages: stages.map(publicPipelineStage) }
  }

  if (method === 'DELETE') {
    const stages = await ensureDefaultPipelineStages(pb, ownerId)
    if (stages.length <= 1) {
      throw createError({ statusCode: 400, message: 'Keep at least one Sales column.' })
    }
    const fallback = stages.find((s) => s.id !== stageId) || stages[0]
    // Move leads still in this stage to the fallback column.
    const leads = await pb.collection('crm_clients').getFullList<{ id: string }>({
      filter: `user = "${escPbFilterId(ownerId)}" && pipeline_stage = "${escPbFilterId(row.key)}"`,
      batch: 200,
    }).catch(() => [])
    for (const lead of leads) {
      await pb.collection('crm_clients').update(lead.id, { pipeline_stage: fallback.key })
    }
    await pb.collection('crm_pipeline_stages').delete(stageId)
    const remaining = await listPipelineStages(pb, ownerId)
    return { ok: true, moved: leads.length, stages: remaining.map(publicPipelineStage) }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
