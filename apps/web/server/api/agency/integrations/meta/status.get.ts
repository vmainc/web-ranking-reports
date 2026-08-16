import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireWorkspaceOwner, getWorkspaceContext } from '~/server/utils/workspace'
import { getAgencyIntegration, publicAgencyIntegration } from '~/server/services/social/agencyMetaIntegration'
import { getMetaConfig } from '~/server/utils/metaConfig'
import { isEmailEncryptionConfigured } from '~/server/services/email/agencyEmailIntegration'
import { decryptIntegrationToken } from '~/server/services/social/agencyMetaIntegration'
import { listMetaManagedPages } from '~/server/utils/metaClient'
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
  if (row?.status === 'connected' && row.encrypted_access_token) {
    try {
      const pages = await listMetaManagedPages(decryptIntegrationToken(row))
      pageCount = pages.length
    } catch (e) {
      pageCount = null
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
    integration: publicAgencyIntegration(refreshed),
  }
})
