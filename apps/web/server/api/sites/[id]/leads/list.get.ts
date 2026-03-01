import { getRouterParam, getQuery } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)
  const query = getQuery(event)
  const formId = query.formId as string | undefined
  const status = query.status as string | undefined
  const search = query.search as string | undefined
  let filter = 'form.site = "' + siteId + '"'
  if (formId) filter += ' && form = "' + formId + '"'
  if (status) filter += ' && status = "' + status + '"'
  if (search && String(search).trim()) {
    const term = String(search).trim().replace(/"/g, '\\"')
    filter += ' && (lead_name ~ "' + term + '" || lead_email ~ "' + term + '" || lead_phone ~ "' + term + '" || lead_website ~ "' + term + '")'
  }
  const list = await pb.collection('lead_submissions').getFullList({ filter, sort: '-submitted_at', expand: 'form' })
  return { leads: list }
})
