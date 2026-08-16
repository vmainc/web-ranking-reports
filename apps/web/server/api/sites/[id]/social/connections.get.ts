import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess, extractPocketBaseRelationId } from '~/server/utils/workspace'
import {
  findFacebookPageConnection,
  listSiteSocialConnections,
  publicSocialConnection,
} from '~/server/services/social/socialConnections'
import { capabilitiesForAccessType, isPublicFacebookProviderAvailable } from '~/server/services/social/capabilities'
import { getAgencyIntegration, publicAgencyIntegration } from '~/server/services/social/agencyMetaIntegration'
import { publicMetricsUnavailableReason } from '~/server/services/social/providers/facebookPublic'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const access = await assertSiteAccess(pb, siteId, userId, false)
  const ownerId = extractPocketBaseRelationId((access.site as { user?: unknown }).user)

  const rows = await listSiteSocialConnections(pb, siteId).catch(() => [])
  const facebook = await findFacebookPageConnection(pb, siteId)
  const meta = publicAgencyIntegration(await getAgencyIntegration(pb, ownerId, 'meta'))

  return {
    canWrite: access.canWrite,
    meta,
    publicProviderAvailable: isPublicFacebookProviderAvailable(),
    publicMetricsUnavailableReason: publicMetricsUnavailableReason(),
    connections: rows.filter((r) => r.status !== 'disconnected').map(publicSocialConnection),
    facebook: facebook
      ? {
          ...publicSocialConnection(facebook),
          capabilities: capabilitiesForAccessType(facebook.access_type, facebook.status),
        }
      : null,
  }
})
