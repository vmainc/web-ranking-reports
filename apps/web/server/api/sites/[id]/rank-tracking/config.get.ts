/**
 * GET /api/sites/:id/rank-tracking/config
 */
import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import {
  DEFAULT_SITE_RANK_TRACKING_CONFIG,
  formatRankContextLabel,
  normalizeSiteRankTrackingConfig,
  siteRankConfigToContext,
} from '~/server/utils/siteRankContext'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteAccess(pb, siteId, userId, false)
  const site = await pb.collection('sites').getOne(siteId)
  const config = normalizeSiteRankTrackingConfig(site.rank_tracking_config)
  const context = siteRankConfigToContext(config)
  return {
    config,
    context: {
      locationCode: context.locationCode,
      locationName: context.locationName,
      languageCode: context.languageCode,
      device: context.device,
      os: context.os,
      includeSubdomains: context.includeSubdomains,
      searchEngine: context.searchEngine,
    },
    label: formatRankContextLabel(context),
    defaults: DEFAULT_SITE_RANK_TRACKING_CONFIG,
  }
})
