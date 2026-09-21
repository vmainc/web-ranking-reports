import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { requireOwnedList } from '~/server/utils/crmBoards'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const listId = getRouterParam(event, 'id')
  if (!listId) throw createError({ statusCode: 400, message: 'List id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  await requireOwnedList(pb, listId, crmOwnerId)
  const body = (await readBody(event).catch(() => ({}))) as { name?: string; sort_order?: number }
  const updates: Record<string, unknown> = {}
  if (body?.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) throw createError({ statusCode: 400, message: 'Name is required' })
    updates.name = name
  }
  if (typeof body?.sort_order === 'number') updates.sort_order = body.sort_order
  const list = await pb.collection('crm_board_lists').update(listId, updates)
  return { list }
})
