import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { requireOwnedList } from '~/server/utils/crmBoards'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'DELETE') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const listId = getRouterParam(event, 'id')
  if (!listId) throw createError({ statusCode: 400, message: 'List id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const list = await requireOwnedList(pb, listId, crmOwnerId)
  const siblings = await pb.collection('crm_board_lists').getFullList({ filter: `board = "${list.board}"` })
  if (siblings.length <= 1) {
    throw createError({ statusCode: 400, message: 'Keep at least one column on the board.' })
  }
  const cards = await pb.collection('crm_board_cards').getFullList({ filter: `list = "${listId}"` })
  for (const card of cards) await pb.collection('crm_board_cards').delete(card.id)
  await pb.collection('crm_board_lists').delete(listId)
  return { ok: true }
})
