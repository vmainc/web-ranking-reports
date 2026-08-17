/**
 * Pinned Graph version for Page Insights (`page_total_media_view_unique` exists on v25+).
 * Latest Graph may be newer; v25.0 remains valid until 2028-07-29. Override with META_GRAPH_API_VERSION.
 * This constant is the only default version string — routes must use getMetaConfig().graphVersion.
 */
export const META_GRAPH_API_VERSION = 'v25.0'

/**
 * Least-privilege Page Insights scopes. Do not add Instagram, Ads, publishing, or visitor-content permissions.
 * pages_read_user_content is not requested: WRR only reads Page metadata, Page-owned posts, and Page Insights.
 */
export const META_OAUTH_SCOPES = ['pages_show_list', 'pages_read_engagement', 'read_insights'] as const

export type MetaConfig = {
  appId: string
  appSecret: string
  redirectUri: string
  graphVersion: string
  /** Facebook Login for Business configuration id. When set, `scope` is omitted from the dialog. */
  loginConfigId: string
  configured: boolean
}

function env(key: string): string {
  if (typeof process === 'undefined' || !process.env) return ''
  return String(process.env[key] || '').trim()
}

export function getMetaConfig(): MetaConfig {
  let appUrl = ''
  let fromRuntime = { appId: '', appSecret: '', redirectUri: '', version: '', configId: '' }
  try {
    const config = useRuntimeConfig()
    appUrl = String(config.appUrl || config.public?.appUrl || '').replace(/\/+$/, '')
    fromRuntime = {
      appId: String(config.metaAppId || '').trim(),
      appSecret: String(config.metaAppSecret || '').trim(),
      redirectUri: String(config.metaOauthRedirectUri || '').trim(),
      version: String(config.metaGraphApiVersion || '').trim(),
      configId: String(config.metaLoginConfigId || '').trim(),
    }
  } catch {
    // outside Nitro
  }

  const appId = fromRuntime.appId || env('META_APP_ID') || env('NUXT_META_APP_ID')
  const appSecret = fromRuntime.appSecret || env('META_APP_SECRET') || env('NUXT_META_APP_SECRET')
  const redirectUri =
    fromRuntime.redirectUri ||
    env('META_OAUTH_REDIRECT_URI') ||
    env('NUXT_META_OAUTH_REDIRECT_URI') ||
    (appUrl ? `${appUrl}/api/agency/integrations/meta/callback` : '')
  const graphVersion =
    fromRuntime.version || env('META_GRAPH_API_VERSION') || env('NUXT_META_GRAPH_API_VERSION') || META_GRAPH_API_VERSION
  const loginConfigId = fromRuntime.configId || env('META_LOGIN_CONFIG_ID') || env('NUXT_META_LOGIN_CONFIG_ID')

  return {
    appId,
    appSecret,
    redirectUri,
    graphVersion: graphVersion.startsWith('v') ? graphVersion : `v${graphVersion}`,
    loginConfigId,
    configured: Boolean(appId && appSecret && redirectUri),
  }
}

export function metaGraphBaseUrl(version?: string): string {
  const v = (version || getMetaConfig().graphVersion).replace(/\/+$/, '')
  return `https://graph.facebook.com/${v}`
}

export function metaOauthDialogUrl(opts: { state: string; redirectUri?: string }): string {
  const cfg = getMetaConfig()
  const params = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: opts.redirectUri || cfg.redirectUri,
    state: opts.state,
    response_type: 'code',
    // Login for Business user-token configs default to implicit (token in the URL hash).
    // The server never sees the fragment; force the authorization-code query param.
    override_default_response_type: 'true',
  })
  if (cfg.loginConfigId) {
    params.set('config_id', cfg.loginConfigId)
  } else {
    params.set('scope', META_OAUTH_SCOPES.join(','))
  }
  return `https://www.facebook.com/${cfg.graphVersion}/dialog/oauth?${params.toString()}`
}
