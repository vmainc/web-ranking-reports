import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireWorkspaceOwner, getWorkspaceContext } from '~/server/utils/workspace'
import { getAgencyIntegration, publicAgencyIntegration } from '~/server/services/social/agencyMetaIntegration'
import { getMetaConfig } from '~/server/utils/metaConfig'
import { isEmailEncryptionConfigured } from '~/server/services/email/agencyEmailIntegration'
import { decryptIntegrationToken } from '~/server/services/social/agencyMetaIntegration'
import { listMetaAdAccounts, listMetaGrantedPermissionNames, listMetaManagedPages } from '~/server/utils/metaClient'
import { isSocialServiceError, SocialErrorCode } from '~/server/services/social/errors'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await requireWorkspaceOwner(pb, userId)
  const ctx = await getWorkspaceContext(pb, userId)

  const row = await getAgencyIntegration(pb, ctx.ownerId, 'meta')
  let pageCount: number | null = null
  let adAccountCount: number | null = null
  let needsBusinessManagement = false
  let needsAdsRead = false
  if (row?.status === 'connected' && row.encrypted_access_token) {
    try {
      const token = decryptIntegrationToken(row)
      const [pages, accounts, granted] = await Promise.all([
        listMetaManagedPages(token),
        listMetaAdAccounts(token).catch(() => [] as Awaited<ReturnType<typeof listMetaAdAccounts>>),
        listMetaGrantedPermissionNames(token),
      ])
      pageCount = pages.length
      adAccountCount = accounts.length
      needsBusinessManagement = !granted.includes('business_management')
      needsAdsRead = !granted.includes('ads_read')
    } catch (e) {
      pageCount = null
      adAccountCount = null
      if (isSocialServiceError(e) && e.code === SocialErrorCode.META_AUTH_EXPIRED) {
        await pb.collection('agency_integrations').update(row.id, {
          status: 'reconnect_required',
          last_error: e.publicMessage,
        })
      }
    }
  }

  const refreshed = await getAgencyIntegration(pb, ctx.ownerId, 'meta')
  const meta = getMetaConfig()
  return {
    configured: meta.configured,
    encryptionConfigured: isEmailEncryptionConfigured(),
    graphVersion: meta.graphVersion,
    oauthRedirectUri: meta.redirectUri,
    pageCount,
    adAccountCount,
    needsBusinessManagement,
    needsAdsRead,
    integration: publicAgencyIntegration(refreshed),
  }
})
