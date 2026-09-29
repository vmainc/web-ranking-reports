import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireWorkspaceOwner, getWorkspaceContext, escPbFilterId } from '~/server/utils/workspace'
import {
  decryptIntegrationToken,
  getAgencyIntegration,
  markMetaReconnectRequired,
  publicAgencyIntegration,
} from '~/server/services/social/agencyMetaIntegration'
import { listMetaAdAccounts, listMetaGrantedPermissionNames, normalizeMetaAdAccountId } from '~/server/utils/metaClient'
import { findAuthenticatedMetaAdAccountMappings } from '~/server/services/social/socialConnections'
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
      message: 'Connect Meta to list ad accounts.',
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
    const token = decryptIntegrationToken(integ)
    const [managed, grantedPermissions] = await Promise.all([
      listMetaAdAccounts(token),
      listMetaGrantedPermissionNames(token),
    ])
    const accounts = []
    for (const raw of managed) {
      const accountId = normalizeMetaAdAccountId(raw.account_id)
      const mappings = await findAuthenticatedMetaAdAccountMappings(pb, accountId)
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
      accounts.push({
        id: accountId,
        name: raw.name || accountId,
        currency: raw.currency || '',
        accountStatus: raw.account_status ?? null,
        businessName: raw.business?.name || '',
        mappedSiteId,
        mappedSiteName,
        mappedConnectionId,
      })
    }

    accounts.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

    return {
      integration: publicAgencyIntegration(integ),
      accounts,
      sites: sites.map((s) => ({ id: s.id, name: s.name, domain: s.domain })),
      grantedPermissions,
      needsAdsRead: !grantedPermissions.includes('ads_read'),
    }
  } catch (e) {
    if (e instanceof SocialServiceError && e.code === SocialErrorCode.META_AUTH_EXPIRED) {
      await markMetaReconnectRequired(pb, integ, e.message)
    }
    throwHttpFromSocial(e)
  }
})
