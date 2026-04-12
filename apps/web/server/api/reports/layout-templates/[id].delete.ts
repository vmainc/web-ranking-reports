import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getWorkspaceContext } from '~/server/utils/workspace'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'DELETE') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const { ownerId } = await getWorkspaceContext(pb, userId)

  const row = await pb.collection('report_layout_templates').getOne<{ user?: string }>(id)
  const rowUser = typeof row.user === 'string' ? row.user : ''
  if (rowUser !== ownerId) throw createError({ statusCode: 403, message: 'Forbidden' })

  await pb.collection('report_layout_templates').delete(id)
  return { ok: true }
})
