import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { verifyStateDetailed, sanitizeReturnPath } from '~/server/utils/stateSign'
import { exchangeCodeForTokens, fetchUserInfo } from '~/server/utils/googleOauth'
import { encryptEmailCredential, EmailCredentialsCryptoError } from '~/server/utils/emailCredentialsCrypto'
import {
  getAgencyEmailIntegration,
  recordAgencyEmailAudit,
  resolveGoogleEmailOauthConfig,
  upsertAgencyEmailIntegration,
} from '~/server/services/email/agencyEmailIntegration'
import { getWorkspaceContext } from '~/server/utils/workspace'

function singleQueryParam(v: unknown): string {
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : ''
  return typeof v === 'string' ? v : ''
}

function redirectToAgency(appUrl: string, returnPath: string, query: string): string {
  const path = sanitizeReturnPath(returnPath)
  const sep = path.includes('?') ? '&' : '?'
  return `${appUrl}${path}${sep}${query}`
}

function stateSigningSecret(): string {
  try {
    const config = useRuntimeConfig()
    const fromConfig = String(config.stateSigningSecret || '').trim()
    if (fromConfig) return fromConfig
  } catch {
    // ignore
  }
  return String(process.env.STATE_SIGNING_SECRET || process.env.NUXT_STATE_SIGNING_SECRET || '').trim()
}

function classifyCallbackError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (e instanceof EmailCredentialsCryptoError || /ENCRYPTION_KEY|decrypt|encrypt/i.test(msg)) {
    return 'encrypt'
  }
  if (/Missing collection|wasn't found|agency_email_integrations|503/i.test(msg)) {
    return 'db'
  }
  if (/token exchange failed|invalid_grant|redirect_uri|invalid_client|unauthorized_client/i.test(msg)) {
    return 'token'
  }
  if (/Google userinfo failed/i.test(msg)) {
    return 'userinfo'
  }
  return 'error'
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = singleQueryParam(query.code)
  const stateRaw = singleQueryParam(query.state)
  const errorParam = singleQueryParam(query.error)

  const config = useRuntimeConfig()
  const secret = stateSigningSecret()
  const appUrl = String(
    (config.appUrl as string) ||
      (config.public as { appUrl?: string }).appUrl ||
      process.env.APP_URL ||
      process.env.NUXT_PUBLIC_APP_URL ||
      'https://webrankingreports.com',
  ).replace(/\/+$/, '')

  if (!secret) {
    console.error('[agency-email-oauth] STATE_SIGNING_SECRET not set')
    return sendRedirect(event, `${appUrl}/agency?emailSending=error`)
  }

  // Best-effort parse return path from state even on early failures
  let returnPath = '/agency'
  if (stateRaw) {
    const early = verifyStateDetailed(secret, stateRaw)
    if (early.ok && early.payload.returnPath) returnPath = early.payload.returnPath
  }

  if (errorParam) {
    const denied = errorParam === 'access_denied'
    return sendRedirect(
      event,
      redirectToAgency(appUrl, returnPath, denied ? 'emailSending=denied' : 'emailSending=error'),
    )
  }

  if (!code || !stateRaw) {
    return sendRedirect(event, redirectToAgency(appUrl, returnPath, 'emailSending=error'))
  }

  const verified = verifyStateDetailed(secret, stateRaw)
  if (!verified.ok) {
    const q = verified.reason === 'expired' ? 'emailSending=state_expired' : 'emailSending=state_invalid'
    return sendRedirect(event, redirectToAgency(appUrl, returnPath, q))
  }

  const payload = verified.payload
  if (payload.mode !== 'email_sending' || !payload.agencyOwnerId) {
    return sendRedirect(event, redirectToAgency(appUrl, returnPath, 'emailSending=state_invalid'))
  }
  returnPath = payload.returnPath || '/agency'

  try {
    const pb = getAdminPb()
    await adminAuth(pb)

    const oauth = await resolveGoogleEmailOauthConfig(pb)
    if (!oauth) {
      return sendRedirect(event, redirectToAgency(appUrl, returnPath, 'emailSending=config'))
    }

    // Ensure the user who started OAuth is still the workspace owner for this agency
    const ctx = await getWorkspaceContext(pb, payload.userId)
    if (ctx.role !== 'owner' || ctx.ownerId !== payload.agencyOwnerId) {
      return sendRedirect(event, redirectToAgency(appUrl, returnPath, 'emailSending=forbidden'))
    }

    let tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>
    try {
      tokens = await exchangeCodeForTokens(oauth, code)
    } catch (exchangeErr) {
      const detail = exchangeErr instanceof Error ? exchangeErr.message : String(exchangeErr)
      console.error('[agency-email-oauth] token exchange failed', detail.slice(0, 300))
      return sendRedirect(event, redirectToAgency(appUrl, returnPath, 'emailSending=token'))
    }

    const userInfo = await fetchUserInfo(tokens.access_token)
    const email = (userInfo.email || '').trim().toLowerCase()
    if (!email) {
      return sendRedirect(event, redirectToAgency(appUrl, returnPath, 'emailSending=no_email'))
    }

    const existing = await getAgencyEmailIntegration(pb, payload.agencyOwnerId)
    const hadConnection = Boolean(existing?.encrypted_refresh_token || existing?.sender_email)

    if (!tokens.refresh_token && !existing?.encrypted_refresh_token) {
      return sendRedirect(event, redirectToAgency(appUrl, returnPath, 'emailSending=missing_refresh'))
    }

    const nowIso = new Date().toISOString()
    const expiresIn = typeof tokens.expires_in === 'number' ? tokens.expires_in : 3600
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString()

    const patch: Record<string, unknown> = {
      provider: 'google',
      delivery_method: 'google',
      sender_email: email,
      google_account_id: userInfo.sub || '',
      scopes: tokens.scope || 'openid email https://www.googleapis.com/auth/gmail.send',
      encrypted_access_token: encryptEmailCredential(tokens.access_token),
      token_expiry: tokenExpiry,
      connection_status: 'connected',
      last_connected_at: nowIso,
      last_send_error: '',
    }
    if (tokens.refresh_token) {
      patch.encrypted_refresh_token = encryptEmailCredential(tokens.refresh_token)
    }

    await upsertAgencyEmailIntegration(pb, payload.agencyOwnerId, patch, payload.userId)
    await recordAgencyEmailAudit(pb, {
      agencyOwnerId: payload.agencyOwnerId,
      actorUserId: payload.userId,
      eventType: hadConnection ? 'google_reconnected' : 'google_connected',
      metadata: { senderEmail: email },
    })

    return sendRedirect(event, redirectToAgency(appUrl, returnPath, 'emailSending=connected'))
  } catch (e) {
    const codeName = classifyCallbackError(e)
    console.error('[agency-email-oauth] callback failed', codeName, e instanceof Error ? e.message.slice(0, 300) : e)
    return sendRedirect(event, redirectToAgency(appUrl, returnPath, `emailSending=${codeName}`))
  }
})
