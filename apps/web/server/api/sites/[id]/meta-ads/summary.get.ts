import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { getMetaAdsSummaryForSite } from '~/server/services/social/metaAdsSummary'
import { throwHttpFromSocial } from '~/server/services/social/errors'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const query = getQuery(event)
  const startDate = String(query.startDate || '').trim()
  const endDate = String(query.endDate || '').trim()

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteAccess(pb, siteId, userId, false)

  try {
    return await getMetaAdsSummaryForSite(pb, {
      siteId,
      userId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
  } catch (e) {
    throwHttpFromSocial(e)
  }
})
