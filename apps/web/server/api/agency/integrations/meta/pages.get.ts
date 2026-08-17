import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireWorkspaceOwner, getWorkspaceContext, escPbFilterId } from '~/server/utils/workspace'
import {
  decryptIntegrationToken,
  getAgencyIntegration,
  markMetaReconnectRequired,
  publicAgencyIntegration,
} from '~/server/services/social/agencyMetaIntegration'
import { listMetaManagedPages } from '~/server/utils/metaClient'
import { findAuthenticatedFacebookPageMappings } from '~/server/services/social/socialConnections'
import { mapManagedPage } from '~/server/services/social/providers/metaFacebookPage'
import { throwHttpFromSocial } from '~/server/services/social/errors'
import { SocialErrorCode, SocialServiceError } from '~/server/services/social/errors'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await requireWorkspaceOwner(pb, userId)
  const ctx = await getWorkspaceContext(pb, userId)

  const integ = await getAgencyIntegration(pb, ctx.ownerId, 'meta')
  if (!integ || integ.status === 'disconnected') {
    throw createError({
      statusCode: 409,
      message: 'Connect Meta to list Facebook Pages.',
      data: { code: SocialErrorCode.META_AUTH_EXPIRED },
    })
  }

  const sites = await pb.collection('sites').getFullList<{ id: string; name: string; domain: string }>({
    filter: `user = "${escPbFilterId(ctx.ownerId)}"`,
    sort: 'name',
    batch: 500,
  })
  const siteById = new Map(sites.map((s) => [s.id, s]))

  try {
    const managed = await listMetaManagedPages(decryptIntegrationToken(integ))
    const pages = []
    for (const raw of managed) {
      const mapped = mapManagedPage(raw)
      const mappings = await findAuthenticatedFacebookPageMappings(pb, mapped.id)
      let mappedSiteId = ''
      let mappedSiteName = ''
      let mappedConnectionId = ''
      for (const row of mappings) {
        const site = siteById.get(row.site)
        if (!site) continue
        mappedSiteId = site.id
        mappedSiteName = site.name || site.domain || ''
        mappedConnectionId = row.id
        break
      }
      pages.push({
        id: mapped.id,
        name: mapped.name,
        username: mapped.username || '',
        link: mapped.link || '',
        followersCount: mapped.followersCount,
        mappedSiteId,
        mappedSiteName,
        mappedConnectionId,
      })
    }

    pages.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

    return {
      integration: publicAgencyIntegration(integ),
      pages,
      sites: sites.map((s) => ({ id: s.id, name: s.name, domain: s.domain })),
    }
  } catch (e) {
    if (e instanceof SocialServiceError && e.code === SocialErrorCode.META_AUTH_EXPIRED) {
      await markMetaReconnectRequired(pb, integ, e.message)
    }
    throwHttpFromSocial(e)
  }
})
