import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireWorkspaceOwner, getWorkspaceContext } from '~/server/utils/workspace'
import { createMetaIntegrationState, sanitizeReturnPath } from '~/server/utils/stateSign'
import { getMetaConfig, metaOauthDialogUrl } from '~/server/utils/metaConfig'
import { isEmailEncryptionConfigured } from '~/server/services/email/agencyEmailIntegration'
import { assertRateLimit } from '~/server/utils/emailSendingRateLimit'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'GET') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  assertRateLimit({
    key: `meta-oauth-connect:${userId}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
    message: 'Too many Meta connect attempts. Try again later.',
  })

  const config = useRuntimeConfig()
  const secret = String(config.stateSigningSecret || process.env.STATE_SIGNING_SECRET || process.env.NUXT_STATE_SIGNING_SECRET || '')
  if (!secret) {
    throw createError({ statusCode: 500, message: 'STATE_SIGNING_SECRET not set' })
  }
  if (!isEmailEncryptionConfigured()) {
    throw createError({
      statusCode: 503,
      message: 'Credential encryption is not available (set EMAIL_CREDENTIALS_ENCRYPTION_KEY or STATE_SIGNING_SECRET).',
    })
  }

  const meta = getMetaConfig()
  if (!meta.configured) {
    throw createError({
      statusCode: 503,
      message: 'Meta is not configured. Set META_APP_ID, META_APP_SECRET, and META_OAUTH_REDIRECT_URI.',
    })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  await requireWorkspaceOwner(pb, userId)
  const ctx = await getWorkspaceContext(pb, userId)

  const query = getQuery(event)
  const returnPath = sanitizeReturnPath(
    typeof query.returnPath === 'string' ? query.returnPath : '/agency?tab=integrations',
    '/agency?tab=integrations',
  )

  const state = createMetaIntegrationState(secret, {
    userId,
    agencyOwnerId: ctx.ownerId,
    returnPath,
  })

  return { url: metaOauthDialogUrl({ state }) }
})
