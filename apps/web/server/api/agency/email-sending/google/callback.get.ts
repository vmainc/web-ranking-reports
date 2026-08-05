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

/** Flatten H3 + PocketBase ClientResponseError into one searchable string. */
function errorText(e: unknown): string {
  if (e == null) return ''
  if (typeof e === 'string') return e
  if (typeof e !== 'object') return String(e)

  const parts: string[] = []
  const any = e as {
    message?: string
    statusMessage?: string
    statusCode?: number
    status?: number
    data?: { message?: string; data?: unknown } | string
    response?: { message?: string; data?: unknown; code?: number }
  }

  if (any.message && any.message !== 'ClientResponseError') parts.push(any.message)
  if (any.statusMessage) parts.push(any.statusMessage)
  if (typeof any.data === 'string') parts.push(any.data)
  else if (any.data?.message) parts.push(String(any.data.message))
  if (any.response?.message) parts.push(String(any.response.message))

  const status = any.statusCode ?? any.status ?? any.response?.code
  if (status) parts.push(`status ${status}`)

  try {
    if (any.response?.data != null) parts.push(JSON.stringify(any.response.data).slice(0, 400))
    else if (any.data && typeof any.data === 'object' && any.data.data != null) {
      parts.push(JSON.stringify(any.data.data).slice(0, 400))
    }
  } catch {
    // ignore
  }

  if (!parts.length && any.message) parts.push(any.message)
  return parts.join(' | ')
}

/** Short, URL-safe hint for the Agency Email banner (no secrets). */
function sanitizeErrorHint(raw: string): string {
  return raw
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/v1:[A-Za-z0-9_.:-]+/g, '[redacted]')
    .replace(/[^\w\s.:,()/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)
}

function classifyCallbackError(e: unknown): string {
  const msg = errorText(e)
  const sdkName = String((e as { message?: string })?.message || '')

  if (e instanceof EmailCredentialsCryptoError || /ENCRYPTION_KEY|decrypt|encrypt/i.test(msg)) {
    return 'encrypt'
  }
  // PocketBase SDK often sets Error.message to only "ClientResponseError"
  if (
    sdkName === 'ClientResponseError' ||
    /Missing collection|wasn't found|agency_email_integrations|Failed to create|Failed to update|validation|Unknown field|status 40[04]/i.test(
      msg,
    )
  ) {
    return 'db'
  }
  if (/token exchange failed|invalid_grant|redirect_uri|invalid_client|unauthorized_client/i.test(msg)) {
    return 'token'
  }
  if (/Google userinfo failed/i.test(msg)) {
    return 'userinfo'
  }
  if (/owner|forbidden|workspace/i.test(msg)) {
    return 'forbidden'
  }
  if (/authenticate|admin|PB_ADMIN|Unauthorized/i.test(msg)) {
    return 'admin_auth'
  }
  return 'error'
}

function mapGoogleOAuthErrorParam(errorParam: string): string {
  const e = errorParam.trim().toLowerCase()
  if (e === 'access_denied') return 'denied'
  if (e === 'redirect_uri_mismatch') return 'redirect_uri'
  if (e.includes('scope')) return 'scope'
  if (e === 'admin_policy_enforced' || e === 'org_internal') return 'policy'
  return 'google_error'
}

function withHint(query: string, hint: string): string {
  const h = sanitizeErrorHint(hint)
  if (!h) return query
  return `${query}&emailSendingHint=${encodeURIComponent(h)}`
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
    return sendRedirect(event, `${appUrl}/agency?tab=email&emailSending=error`)
  }

  // Best-effort parse return path from state even on early failures
  let returnPath = '/agency?tab=email'
  if (stateRaw) {
    const early = verifyStateDetailed(secret, stateRaw)
    if (early.ok && early.payload.returnPath) returnPath = early.payload.returnPath
  }

  if (errorParam) {
    const codeName = mapGoogleOAuthErrorParam(errorParam)
    console.error(
      '[agency-email-oauth] Google returned error',
      errorParam,
      singleQueryParam(query.error_description).slice(0, 200),
    )
    return sendRedirect(event, redirectToAgency(appUrl, returnPath, `emailSending=${codeName}`))
  }

  if (!code || !stateRaw) {
    console.error('[agency-email-oauth] missing code or state', { hasCode: Boolean(code), hasState: Boolean(stateRaw) })
    return sendRedirect(event, redirectToAgency(appUrl, returnPath, 'emailSending=missing_params'))
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
  returnPath = payload.returnPath || '/agency?tab=email'

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
      console.error('[agency-email-oauth] token exchange failed', {
        redirectUri: oauth.redirect_uri,
        detail: detail.slice(0, 400),
      })
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
    const detail = errorText(e)
    console.error('[agency-email-oauth] callback failed', codeName, detail.slice(0, 500))
    return sendRedirect(
      event,
      redirectToAgency(appUrl, returnPath, withHint(`emailSending=${codeName}`, detail)),
    )
  }
})
