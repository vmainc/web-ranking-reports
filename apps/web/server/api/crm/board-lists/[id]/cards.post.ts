import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { crmRowOwnedByUser, requireCrmOwnerId } from '~/server/utils/workspace'
import { leadCardTitle, requireOwnedList } from '~/server/utils/crmBoards'
import { assertPlanLimit } from '~/server/utils/planGuard'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const listId = getRouterParam(event, 'id')
  if (!listId) throw createError({ statusCode: 400, message: 'List id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const list = await requireOwnedList(pb, listId, crmOwnerId)
  const body = (await readBody(event).catch(() => ({}))) as {
    title?: string
    description?: string
    client?: string | null
    create_contact?: boolean
    company?: string
    email?: string
  }
  let title = body?.title?.trim() || ''
  let clientId = body?.client?.trim() || null

  if (clientId) {
    const client = await pb.collection('crm_clients').getOne(clientId)
    if (!crmRowOwnedByUser(client as { user?: unknown }, crmOwnerId)) {
      throw createError({ statusCode: 403, message: 'Contact not found or access denied' })
    }
    if (!title) title = leadCardTitle(client as Parameters<typeof leadCardTitle>[0])
  } else if (body?.create_contact) {
    if (!title) throw createError({ statusCode: 400, message: 'Title is required' })
    await assertPlanLimit(pb, crmOwnerId, 'contacts', 1)
    const created = await pb.collection('crm_clients').create({
      user: crmOwnerId,
      name: title,
      first_name: title.split(/\s+/)[0] || title,
      last_name: title.split(/\s+/).slice(1).join(' ') || null,
      company: body?.company?.trim() || null,
      email: body?.email?.trim() || null,
      status: 'lead',
      pipeline_stage: 'new',
    })
    clientId = created.id
  }

  if (!title) throw createError({ statusCode: 400, message: 'Title is required' })

  const existing = await pb.collection('crm_board_cards').getFullList({ filter: `list = "${listId}"` })
  const card = await pb.collection('crm_board_cards').create({
    user: crmOwnerId,
    board: list.board,
    list: listId,
    title,
    description: body?.description?.trim() || null,
    client: clientId,
    sort_order: existing.length,
  })

  if (clientId) {
    await pb.collection('crm_clients').update(clientId, { last_activity_at: new Date().toISOString() }).catch(() => {})
  }

  const full = await pb.collection('crm_board_cards').getOne(card.id, { expand: 'client' })
  return { card: full }
})
