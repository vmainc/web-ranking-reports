import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const body = (await readBody(event).catch(() => ({}))) as { name?: string }
  const name = body?.name?.trim() || 'New board'
  const existing = await pb.collection('crm_boards').getFullList({ filter: `user = "${crmOwnerId}"` })
  const sortOrder = existing.length
  const board = await pb.collection('crm_boards').create({
    user: crmOwnerId,
    name,
    sort_order: sortOrder,
    is_default: existing.length === 0,
  })
  await pb.collection('crm_board_lists').create({
    user: crmOwnerId,
    board: board.id,
    name: 'Inbox',
    sort_order: 0,
  })
  return { board }
})
