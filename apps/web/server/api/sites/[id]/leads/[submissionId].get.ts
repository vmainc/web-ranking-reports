import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const siteId = getRouterParam(event, 'id')
  const submissionId = getRouterParam(event, 'submissionId')
  if (!siteId || !submissionId) throw createError({ statusCode: 400, message: 'Site id and submission id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)
  const submission = await pb.collection('lead_submissions').getOne(submissionId, { expand: 'form' })
  const form = submission.expand?.form as { site?: string } | undefined
  if (form?.site !== siteId) throw createError({ statusCode: 404, message: 'Lead not found' })
  return submission
})
