import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { loadAgencyCampaignFooterHtml } from '~/server/utils/campaignEmail'

/** Footer snippet for the campaign composer (read-only preview). */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const agencyOwnerId = await requireCrmOwnerId(pb, userId)
  const html = await loadAgencyCampaignFooterHtml(pb, agencyOwnerId)
  return { campaignFooterHtml: html }
})