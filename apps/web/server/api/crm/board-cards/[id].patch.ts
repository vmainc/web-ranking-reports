import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { requireOwnedCard, requireOwnedList } from '~/server/utils/crmBoards'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const cardId = getRouterParam(event, 'id')
  if (!cardId) throw createError({ statusCode: 400, message: 'Card id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const existing = await requireOwnedCard(pb, cardId, crmOwnerId)
  const body = (await readBody(event).catch(() => ({}))) as {
    title?: string
    description?: string | null
    list?: string
    sort_order?: number
  }
  const updates: Record<string, unknown> = {}
  if (body?.title !== undefined) {
    const title = String(body.title).trim()
    if (!title) throw createError({ statusCode: 400, message: 'Title is required' })
    updates.title = title
  }
  if (body?.description !== undefined) {
    updates.description = body.description ? String(body.description).trim() : null
  }
  if (typeof body?.sort_order === 'number') updates.sort_order = body.sort_order
  if (body?.list !== undefined) {
    const listId = String(body.list).trim()
    if (!listId) throw createError({ statusCode: 400, message: 'List is required' })
    const list = await requireOwnedList(pb, listId, crmOwnerId)
    if (list.board !== existing.board) {
      throw createError({ statusCode: 400, message: 'Cards can only move within the same board' })
    }
    updates.list = listId
  }
  await pb.collection('crm_board_cards').update(cardId, updates)
  const card = await pb.collection('crm_board_cards').getOne(cardId, { expand: 'client' })
  return { card }
})
