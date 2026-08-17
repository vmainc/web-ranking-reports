import type { H3Event } from 'h3'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { verifyStateDetailed, sanitizeReturnPath } from '~/server/utils/stateSign'
import { getMetaConfig, META_OAUTH_SCOPES } from '~/server/utils/metaConfig'
import {
  exchangeMetaCodeForToken,
  exchangeMetaLongLivedToken,
  fetchMetaMe,
  listMetaManagedPages,
} from '~/server/utils/metaClient'
import { encryptIntegrationToken, upsertAgencyMetaIntegration } from '~/server/services/social/agencyMetaIntegration'
import { refreshMappedPageTokensAfterOAuth } from '~/server/services/social/mapMetaPage'
import { getWorkspaceContext } from '~/server/utils/workspace'
import { isEmailEncryptionConfigured } from '~/server/services/email/agencyEmailIntegration'
import {
  collectMetaOAuthParams,
  hasMetaOAuthError,
  isMetaOAuthDenied,
  metaOAuthHashRecoveryHtml,
} from '~/server/utils/metaOAuthParams'

function redirectToAgency(appUrl: string, returnPath: string, query: string): string {
  const path = sanitizeReturnPath(returnPath, '/agency?tab=integrations')
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

function refererHost(event: H3Event): string {
  const raw = getRequestHeader(event, 'referer') || getRequestHeader(event, 'referrer') || ''
  try {
    return raw ? new URL(raw).host : ''
  } catch {
    return ''
  }
}

async function readCallbackBody(event: H3Event): Promise<Record<string, unknown> | null> {
  if (getMethod(event) !== 'POST') return null
  try {
    const body = await readBody(event)
    if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>
  } catch {
    // empty or non-form POST
  }
  return null
}

export async function handleMetaOAuthCallback(event: H3Event) {
  const query = getQuery(event) as Record<string, unknown>
  const body = await readCallbackBody(event)
  const params = collectMetaOAuthParams(query, body)
  const method = getMethod(event)

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
    console.error('[meta.oauth.failed]', { reason: 'STATE_SIGNING_SECRET not set' })
    return sendRedirect(event, `${appUrl}/agency?tab=integrations&meta=error`)
  }

  let returnPath = '/agency?tab=integrations'
  if (params.state) {
    const early = verifyStateDetailed(secret, params.state)
    if (early.ok && early.payload.returnPath) returnPath = early.payload.returnPath
  }

  if (hasMetaOAuthError(params)) {
    const denied = isMetaOAuthDenied(params)
    console.warn('[meta.oauth.failed]', {
      reason: denied ? 'denied' : 'oauth_error',
      method,
      error: params.error || undefined,
      errorCode: params.errorCode || undefined,
      errorMessage: (params.errorMessage || params.errorDescription).slice(0, 180) || undefined,
      refererHost: refererHost(event) || undefined,
    })
    return sendRedirect(event, redirectToAgency(appUrl, returnPath, denied ? 'meta=denied' : 'meta=error'))
  }

  if ((!params.code && !params.accessToken) || !params.state) {
    const missingUrl = redirectToAgency(appUrl, returnPath, 'meta=missing_params')
    // GET with an empty query may still have a hash the server cannot see.
    if (method === 'GET' && params.keys.length === 0) {
      console.warn('[meta.oauth.failed]', {
        reason: 'missing_params_check_hash',
        method,
        hasCode: false,
        hasState: false,
        hasAccessToken: false,
        queryKeys: params.keys,
        refererHost: refererHost(event) || undefined,
      })
      setHeader(event, 'content-type', 'text/html; charset=utf-8')
      setHeader(event, 'cache-control', 'no-store')
      return metaOAuthHashRecoveryHtml(missingUrl)
    }
    console.warn('[meta.oauth.failed]', {
      reason: 'missing_params',
      method,
      hasCode: Boolean(params.code),
      hasState: Boolean(params.state),
      hasAccessToken: Boolean(params.accessToken),
      queryKeys: params.keys.filter((k) => k !== 'access_token' && k !== 'code' && k !== 'state'),
      refererHost: refererHost(event) || undefined,
    })
    return sendRedirect(event, missingUrl)
  }

  const verified = verifyStateDetailed(secret, params.state)
  if (!verified.ok) {
    const q = verified.reason === 'expired' ? 'meta=state_expired' : 'meta=state_invalid'
    console.warn('[meta.oauth.failed]', { reason: verified.reason, method })
    return sendRedirect(event, redirectToAgency(appUrl, returnPath, q))
  }

  const payload = verified.payload
  if (payload.mode !== 'meta_integration' || !payload.agencyOwnerId) {
    return sendRedirect(event, redirectToAgency(appUrl, returnPath, 'meta=state_invalid'))
  }
  returnPath = payload.returnPath || '/agency?tab=integrations'

  try {
    if (!isEmailEncryptionConfigured()) {
      return sendRedirect(event, redirectToAgency(appUrl, returnPath, 'meta=encrypt'))
    }
    const meta = getMetaConfig()
    if (!meta.configured) {
      return sendRedirect(event, redirectToAgency(appUrl, returnPath, 'meta=config'))
    }

    const pb = getAdminPb()
    await adminAuth(pb)

    const ctx = await getWorkspaceContext(pb, payload.userId)
    if (ctx.role !== 'owner' || ctx.ownerId !== payload.agencyOwnerId) {
      return sendRedirect(event, redirectToAgency(appUrl, returnPath, 'meta=forbidden'))
    }

    const shortLived = params.code
      ? await exchangeMetaCodeForToken(params.code)
      : { accessToken: params.accessToken }
    const longLived = await exchangeMetaLongLivedToken(shortLived.accessToken)
    const me = await fetchMetaMe(longLived.accessToken)
    const pages = await listMetaManagedPages(longLived.accessToken).catch(() => [])

    const expiresIn = typeof longLived.expiresIn === 'number' ? longLived.expiresIn : 60 * 60 * 24 * 60
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
    const nowIso = new Date().toISOString()

    await upsertAgencyMetaIntegration(pb, payload.agencyOwnerId, {
      external_user_id: me.id,
      display_name: me.name || '',
      encrypted_access_token: encryptIntegrationToken(longLived.accessToken),
      token_expires_at: tokenExpiresAt,
      scopes: META_OAUTH_SCOPES.join(','),
      status: 'connected',
      last_verified_at: nowIso,
      last_error: '',
      created_by: payload.userId,
      updated_by: payload.userId,
    })

    let tokensRefreshed = 0
    try {
      const refresh = await refreshMappedPageTokensAfterOAuth(pb, payload.agencyOwnerId, pages)
      tokensRefreshed = refresh.refreshed
    } catch {
      // Mapping refresh must not fail the OAuth redirect; existing snapshots stay.
    }

    console.info('[meta.oauth.connected]', {
      agencyId: payload.agencyOwnerId,
      pageCount: pages.length,
      tokensRefreshed,
    })
    return sendRedirect(event, redirectToAgency(appUrl, returnPath, 'meta=connected'))
  } catch (e) {
    console.error('[meta.oauth.failed]', {
      reason: 'callback',
      message: e instanceof Error ? e.message.slice(0, 200) : 'unknown',
    })
    return sendRedirect(event, redirectToAgency(appUrl, returnPath, 'meta=error'))
  }
}
