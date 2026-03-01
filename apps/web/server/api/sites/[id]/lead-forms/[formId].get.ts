import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const siteId = getRouterParam(event, 'id')
  const formId = getRouterParam(event, 'formId')
  if (!siteId || !formId) throw createError({ statusCode: 400, message: 'Site id and form id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)
  const form = await pb.collection('lead_forms').getOne(formId)
  if ((form as { site: string }).site !== siteId) throw createError({ statusCode: 404, message: 'Form not found' })
  return form
})
