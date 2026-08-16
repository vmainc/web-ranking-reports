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

function singleQueryParam(v: unknown): string {
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : ''
  return typeof v === 'string' ? v : ''
}

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
    console.error('[meta.oauth.failed]', { reason: 'STATE_SIGNING_SECRET not set' })
    return sendRedirect(event, `${appUrl}/agency?tab=integrations&meta=error`)
  }

  let returnPath = '/agency?tab=integrations'
  if (stateRaw) {
    const early = verifyStateDetailed(secret, stateRaw)
    if (early.ok && early.payload.returnPath) returnPath = early.payload.returnPath
  }

  if (errorParam) {
    const denied = errorParam.toLowerCase() === 'access_denied'
    console.warn('[meta.oauth.failed]', { reason: denied ? 'denied' : 'oauth_error' })
    return sendRedirect(event, redirectToAgency(appUrl, returnPath, denied ? 'meta=denied' : 'meta=error'))
  }

  if (!code || !stateRaw) {
    console.warn('[meta.oauth.failed]', { reason: 'missing_params', hasCode: Boolean(code), hasState: Boolean(stateRaw) })
    return sendRedirect(event, redirectToAgency(appUrl, returnPath, 'meta=missing_params'))
  }

  const verified = verifyStateDetailed(secret, stateRaw)
  if (!verified.ok) {
    const q = verified.reason === 'expired' ? 'meta=state_expired' : 'meta=state_invalid'
    console.warn('[meta.oauth.failed]', { reason: verified.reason })
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

    const shortLived = await exchangeMetaCodeForToken(code)
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
})
