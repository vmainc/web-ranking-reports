import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireWorkspaceOwner, getWorkspaceContext } from '~/server/utils/workspace'
import { createEmailSendingState, sanitizeReturnPath } from '~/server/utils/stateSign'
import { buildAuthUrl } from '~/server/utils/googleOauth'
import {
  GMAIL_SEND_SCOPES,
  getAgencyEmailIntegration,
  isEmailEncryptionConfigured,
  resolveGoogleEmailOauthConfig,
} from '~/server/services/email/agencyEmailIntegration'
import { assertRateLimit } from '~/server/utils/emailSendingRateLimit'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'GET') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  assertRateLimit({
    key: `email-oauth-connect:${userId}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
    message: 'Too many Google connect attempts. Try again later.',
  })

  const config = useRuntimeConfig()
  const secret = String(config.stateSigningSecret || process.env.STATE_SIGNING_SECRET || process.env.NUXT_STATE_SIGNING_SECRET || '')
  if (!secret) {
    throw createError({ statusCode: 500, message: 'STATE_SIGNING_SECRET not set' })
  }

  if (!isEmailEncryptionConfigured()) {
    throw createError({
      statusCode: 503,
      message: 'Email credential encryption is not available (set EMAIL_CREDENTIALS_ENCRYPTION_KEY or STATE_SIGNING_SECRET).',
    })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  await requireWorkspaceOwner(pb, userId)
  const ctx = await getWorkspaceContext(pb, userId)

  const oauth = await resolveGoogleEmailOauthConfig(pb)
  if (!oauth) {
    throw createError({
      statusCode: 503,
      message:
        'Google OAuth is not configured. Set GOOGLE_CLIENT_* env vars, or save Google client id/secret under Admin → Integrations.',
    })
  }

  const query = getQuery(event)
  const returnPath = sanitizeReturnPath(typeof query.returnPath === 'string' ? query.returnPath : '/agency?tab=email')
  const forceConsent = query.forceConsent === 'true' || query.forceConsent === '1'

  const existing = await getAgencyEmailIntegration(pb, ctx.ownerId)
  const promptConsent = forceConsent || !existing?.encrypted_refresh_token

  const state = createEmailSendingState(secret, {
    userId,
    agencyOwnerId: ctx.ownerId,
    returnPath,
  })

  const url = buildAuthUrl({
    clientId: oauth.client_id,
    redirectUri: oauth.redirect_uri,
    scopes: [...GMAIL_SEND_SCOPES],
    state,
    accessType: 'offline',
    includeGrantedScopes: false,
    ...(promptConsent ? { prompt: 'consent' as const } : {}),
  })

  return { url }
})
