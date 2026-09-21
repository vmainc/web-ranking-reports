import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { requireOwnedBoard } from '~/server/utils/crmBoards'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'DELETE') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const boardId = getRouterParam(event, 'id')
  if (!boardId) throw createError({ statusCode: 400, message: 'Board id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  await requireOwnedBoard(pb, boardId, crmOwnerId)
  const boards = await pb.collection('crm_boards').getFullList({ filter: `user = "${crmOwnerId}"` })
  if (boards.length <= 1) {
    throw createError({ statusCode: 400, message: 'Keep at least one shared board for the team.' })
  }
  const cards = await pb.collection('crm_board_cards').getFullList({ filter: `board = "${boardId}"` })
  for (const card of cards) await pb.collection('crm_board_cards').delete(card.id)
  const lists = await pb.collection('crm_board_lists').getFullList({ filter: `board = "${boardId}"` })
  for (const list of lists) await pb.collection('crm_board_lists').delete(list.id)
  await pb.collection('crm_boards').delete(boardId)
  return { ok: true }
})
