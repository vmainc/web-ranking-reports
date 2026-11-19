import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'

/** Remove a website audit submission and its stored report (public link stops working). */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'DELETE') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Lead id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const ownerId = await requireCrmOwnerId(pb, userId)

  const lead = await pb.collection('website_audit_leads').getOne<{ user?: string }>(id)
  if (String(lead.user ?? '') !== ownerId) throw createError({ statusCode: 403, message: 'Forbidden' })

  await pb.collection('website_audit_leads').delete(id)
  return { ok: true }
})