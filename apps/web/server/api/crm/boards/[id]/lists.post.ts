import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { requireOwnedBoard } from '~/server/utils/crmBoards'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const boardId = getRouterParam(event, 'id')
  if (!boardId) throw createError({ statusCode: 400, message: 'Board id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  await requireOwnedBoard(pb, boardId, crmOwnerId)
  const body = (await readBody(event).catch(() => ({}))) as { name?: string }
  const name = body?.name?.trim() || 'New list'
  const existing = await pb.collection('crm_board_lists').getFullList({ filter: `board = "${boardId}"` })
  const list = await pb.collection('crm_board_lists').create({
    user: crmOwnerId,
    board: boardId,
    name,
    sort_order: existing.length,
  })
  return { list }
})
