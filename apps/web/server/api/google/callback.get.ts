import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { verifyState, type StatePayload } from '~/server/utils/stateSign'
import { exchangeCodeForTokens, fetchUserInfo } from '~/server/utils/googleOauth'
import { runLighthouseForSite } from '~/server/utils/lighthouse'

function successRedirect(appUrl: string, payload: StatePayload) {
  if (payload.mode === 'account') {
    return `${appUrl}/account?google=connected`
  }
  if (payload.afterConnect === 'setup') {
    return `${appUrl}/sites/${payload.siteId}/setup?google=connected`
  }
  if (payload.afterConnect === 'business-profile') {
    return `${appUrl}/sites/${payload.siteId}/business-profile?google=connected`
  }
  return `${appUrl}/sites/${payload.siteId}/dashboard?google=connected`
}

function siteErrorRedirect(appUrl: string, payload: StatePayload, kind: 'error' | 'denied') {
  const q = kind === 'denied' ? 'google=denied' : 'google=error'
  if (payload.mode === 'account') {
    return `${appUrl}/account?${q}`
  }
  if (payload.afterConnect === 'setup') {
    return `${appUrl}/sites/${payload.siteId}/setup?${q}`
  }
  if (payload.afterConnect === 'business-profile') {
    return `${appUrl}/sites/${payload.siteId}/business-profile?${q}`
  }
  return `${appUrl}/sites/${payload.siteId}?${q}`
}

const GOOGLE_ANCHOR = 'google_analytics'
const GOOGLE_PROVIDERS = [
  'google_analytics',
  'google_search_console',
  'lighthouse',
  'google_business_profile',
  'google_ads',
  'google_calendar',
] as const

function getConfig() {
  const config = useRuntimeConfig()
  return {
    secret: config.stateSigningSecret as string,
    appUrl: (config.appUrl as string).replace(/\/+$/, ''),
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string
  const stateRaw = query.state as string
  const errorParam = query.error as string | undefined

  const { secret, appUrl } = getConfig()
  if (!secret) {
    console.error('Google callback: STATE_SIGNING_SECRET not set')
    return sendRedirect(event, `${appUrl}/dashboard?google=error`)
  }

  if (errorParam) {
    console.error('Google callback: OAuth error', errorParam, query.error_description)
    return sendRedirect(event, `${appUrl}/dashboard?google=denied`)
  }

  if (!code || !stateRaw) {
    return sendRedirect(event, `${appUrl}/dashboard?google=error`)
  }

  const payload = verifyState(secret, stateRaw) as StatePayload | null
  if (!payload) {
    console.error('Google callback: invalid or expired state')
    return sendRedirect(event, `${appUrl}/dashboard?google=error`)
  }

  const pb = getAdminPb()
  await adminAuth(pb)

  let settings: { client_id: string; client_secret: string; redirect_uri: string }
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value: typeof settings }>('key="google_oauth"')
    settings = row?.value as typeof settings
  } catch {
    return sendRedirect(event, siteErrorRedirect(appUrl, payload, 'error'))
  }

  let tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>
  let email: string | undefined
  let googleSub: string | undefined
  try {
    tokens = await exchangeCodeForTokens(settings, code)
    const userInfo = await fetchUserInfo(tokens.access_token)
    googleSub = userInfo.sub
    email = userInfo.email
  } catch (e) {
    console.error('Google callback: token/userinfo failed', e)
    if (payload.mode !== 'account') {
      await setAnchorError(pb, payload.siteId, String(e))
    }
    return sendRedirect(event, siteErrorRedirect(appUrl, payload, 'error'))
  }

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : new Date(Date.now() + 3600 * 1000).toISOString()

  /** User-level default Google (Account settings + dashboard calendar). */
  if (payload.mode === 'account') {
    try {
      const prev = await pb.collection('users').getOne<{ default_google_json?: Record<string, unknown> }>(payload.userId)
      const prevJson = { ...(prev?.default_google_json ?? {}) } as Record<string, unknown>
      const prevGoogle = (prevJson.google as Record<string, unknown>) ?? {}
      const prevSub = typeof prevGoogle.google_sub === 'string' ? prevGoogle.google_sub : undefined

      const googleObj: Record<string, unknown> = {
        access_token: tokens.access_token,
        token_type: tokens.token_type || 'Bearer',
        scope: tokens.scope ?? '',
        expires_at: expiresAt,
        google_sub: googleSub,
        email: email ?? '',
      }
      if (tokens.refresh_token) {
        googleObj.refresh_token = tokens.refresh_token
      } else if (prevGoogle.refresh_token) {
        googleObj.refresh_token = prevGoogle.refresh_token
      }

      const newJson: Record<string, unknown> = {
        ...prevJson,
        google: googleObj,
      }

      if (googleSub && prevSub && googleSub !== prevSub) {
        delete newJson.calendar_id
        delete newJson.calendar_summary
        delete newJson.dashboard_calendars
      }

      await pb.collection('users').update(payload.userId, { default_google_json: newJson })
    } catch (e) {
      console.error('Google callback: account default_google_json update failed', e)
      return sendRedirect(event, `${appUrl}/account?google=error`)
    }
    return sendRedirect(event, successRedirect(appUrl, payload))
  }

  const existing = await getAnchorIntegration(pb, payload.siteId)
  const existingConfig = { ...(existing?.config_json ?? {}) } as Record<string, unknown>
  const anchorConfig: Record<string, unknown> = {
    ...existingConfig,
    google: {
      access_token: tokens.access_token,
      token_type: tokens.token_type || 'Bearer',
      scope: tokens.scope ?? '',
      expires_at: expiresAt,
      google_sub: googleSub,
      email: email ?? '',
    },
  }
  if (tokens.refresh_token) {
    (anchorConfig.google as Record<string, unknown>).refresh_token = tokens.refresh_token
  } else {
    if (existing?.config_json?.google?.refresh_token) {
      (anchorConfig.google as Record<string, unknown>).refresh_token = existing.config_json.google.refresh_token
    }
  }

  // When intentionally reconnecting from Business Profile, force re-selecting location for the new account.
  if (payload.afterConnect === 'business-profile') {
    delete anchorConfig.gbp_account_id
    delete anchorConfig.gbp_location_id
    delete anchorConfig.gbp_location_name
    // Keep GA/GSC selections, but clear Ads selection because the new Google account
    // may not have access to the previously selected Ads customer.
    delete anchorConfig.ads_customer_id
    delete anchorConfig.ads_customer_name
    delete anchorConfig.ads_login_customer_id
  }

  for (const provider of GOOGLE_PROVIDERS) {
    await upsertIntegration(pb, payload.siteId, provider, provider === GOOGLE_ANCHOR ? anchorConfig : { linked_to: GOOGLE_ANCHOR })
  }

  // Run Lighthouse when first connecting Google (same account); don't block redirect
  runLighthouseForSite(pb, payload.siteId).catch((e) => console.error('Lighthouse run after connect', e))

  return sendRedirect(event, successRedirect(appUrl, payload))
})

async function getAnchorIntegration(
  pb: { collection: (n: string) => { getFullList: (o: { filter: string }) => Promise<{ id: string; config_json?: { google?: { refresh_token?: string } } & Record<string, unknown> }[]> } },
  siteId: string
) {
  const list = await pb.collection('integrations').getFullList<{ id: string; config_json?: { google?: { refresh_token?: string } } & Record<string, unknown> }>({
    filter: `site = "${siteId}" && provider = "${GOOGLE_ANCHOR}"`,
  })
  return list[0] ?? null
}

async function upsertIntegration(
  pb: InstanceType<typeof import('pocketbase').default>,
  siteId: string,
  provider: string,
  configJson: Record<string, unknown>
) {
  const list = await pb.collection('integrations').getFullList<{ id: string }>({
    filter: `site = "${siteId}" && provider = "${provider}"`,
  })
  if (list.length > 0) {
    await pb.collection('integrations').update(list[0].id, {
      status: 'connected',
      connected_at: new Date().toISOString(),
      config_json: configJson,
    })
  } else {
    await pb.collection('integrations').create({
      site: siteId,
      provider,
      status: 'connected',
      connected_at: new Date().toISOString(),
      config_json: configJson,
    })
  }
}

async function setAnchorError(
  pb: InstanceType<typeof import('pocketbase').default>,
  siteId: string,
  message: string
) {
  try {
    const list = await pb.collection('integrations').getFullList<{ id: string; config_json?: Record<string, unknown> }>({
      filter: `site = "${siteId}" && provider = "${GOOGLE_ANCHOR}"`,
    })
    if (list.length > 0) {
      const config = list[0].config_json ?? {}
      const google = (config.google as Record<string, unknown>) ?? {}
      google.last_error = message
      await pb.collection('integrations').update(list[0].id, {
        status: 'error',
        config_json: { ...config, google },
      })
    }
  } catch (e) {
    console.error('setAnchorError', e)
  }
}
