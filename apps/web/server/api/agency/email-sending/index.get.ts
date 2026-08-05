import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireWorkspaceOwner, getWorkspaceContext } from '~/server/utils/workspace'
import {
  getAgencyEmailIntegration,
  isEmailEncryptionConfigured,
  resolveGoogleEmailOauthConfig,
  toSanitizedEmailSettings,
} from '~/server/services/email/agencyEmailIntegration'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'GET') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await requireWorkspaceOwner(pb, userId)
  const ctx = await getWorkspaceContext(pb, userId)

  const row = await getAgencyEmailIntegration(pb, ctx.ownerId)
  const oauth = await resolveGoogleEmailOauthConfig(pb)
  return {
    settings: toSanitizedEmailSettings(row, {
      googleConfigured: Boolean(oauth),
      encryptionConfigured: isEmailEncryptionConfigured(),
      oauthRedirectUri: oauth?.redirect_uri,
    }),
  }
})
