import { getMethod, getRouterParam, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { assertPlanLimit } from '~/server/utils/planGuard'
import { ensureDefaultPipelineStages } from '~/server/services/crm/pipelineStages'
import { requireOwnedList } from '~/server/utils/crmBoards'
import {
  defaultLeadNameFromAudit,
  formatProspectAuditNotes,
  getProspectAudit,
  saveProspectAudit,
} from '~/server/utils/prospectAudit'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const auditId = getRouterParam(event, 'id')
  if (!auditId) throw createError({ statusCode: 400, message: 'Audit id required' })

  const body = (await readBody(event).catch(() => ({}))) as {
    name?: string
    email?: string
    company?: string
    createBoardCard?: boolean
    boardListId?: string
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  const ownerId = await requireCrmOwnerId(pb, userId)

  const audit = await getProspectAudit(pb, ownerId, auditId)
  if (!audit) throw createError({ statusCode: 404, message: 'Prospect audit not found' })
  if (audit.leadId) {
    throw createError({ statusCode: 400, message: 'This audit was already converted to a lead.' })
  }

  await assertPlanLimit(pb, ownerId, 'contacts', 1)
  const stages = await ensureDefaultPipelineStages(pb, ownerId)
  const pipelineStage = stages.find((s) => s.key === 'new')?.key || stages[0]?.key || 'new'

  const name = String(body.name || '').trim() || defaultLeadNameFromAudit(audit)
  const company = String(body.company || '').trim() || audit.domain
  const notes = formatProspectAuditNotes(audit)

  const client = await pb.collection('crm_clients').create({
    user: ownerId,
    name,
    company,
    email: String(body.email || '').trim() || null,
    status: 'lead',
    pipeline_stage: pipelineStage,
    source: 'Prospect audit',
    notes,
    tags_json: ['prospect-audit', audit.domain],
  })

  audit.leadId = client.id
  audit.updatedAt = new Date().toISOString()
  const audits = await saveProspectAudit(pb, ownerId, audit)

  let card: { id: string; title: string } | null = null
  if (body.createBoardCard && body.boardListId) {
    const listId = String(body.boardListId).trim()
    try {
      const list = await requireOwnedList(pb, listId, ownerId)
      const existing = await pb.collection('crm_board_cards').getFullList({ filter: `list = "${listId}"` })
      const created = await pb.collection('crm_board_cards').create({
        user: ownerId,
        board: list.board,
        list: listId,
        title: name,
        description: notes,
        client: client.id,
        sort_order: existing.length,
      })
      card = { id: created.id, title: String(created.title || name) }
    } catch {
      // Board card is optional; lead conversion already succeeded.
    }
  }

  return {
    client: { id: client.id, name: client.name, pipeline_stage: client.pipeline_stage },
    audit,
    audits,
    card,
  }
})
