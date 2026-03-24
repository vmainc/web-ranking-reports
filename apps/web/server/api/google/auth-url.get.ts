import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { createState, type AfterConnectDestination } from '~/server/utils/stateSign'
import { buildAuthUrl } from '~/server/utils/googleOauth'

const GOOGLE_ANCHOR = 'google_analytics'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const siteId = (query.siteId as string) || ''
  const accountMode = query.mode === 'account'
  const forceConsent = query.forceConsent === 'true' || query.forceConsent === '1'
  const afterRaw = query.afterConnect as string | undefined
  let afterConnect: AfterConnectDestination | undefined
  if (afterRaw === 'setup' || afterRaw === 'dashboard' || afterRaw === 'business-profile') {
    afterConnect = afterRaw
  }
  if (!accountMode && !siteId) {
    throw createError({ statusCode: 400, message: 'siteId required' })
  }

  const config = useRuntimeConfig()
  const secret = config.stateSigningSecret as string
  if (!secret) {
    throw createError({ statusCode: 500, message: 'STATE_SIGNING_SECRET not set' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  if (accountMode) {
    // User-level default Google: no site; only the signed-in user may connect.
    const me = await pb.collection('users').getOne<{ id: string }>(userId).catch(() => null)
    if (!me || me.id !== userId) {
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  } else {
    await assertSiteOwnership(pb, siteId, userId)
  }

  let settings: { client_id: string; client_secret: string; redirect_uri: string; scopes?: string[] }
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value: typeof settings }>('key="google_oauth"')
    settings = row?.value as typeof settings
  } catch {
    throw createError({ statusCode: 500, message: 'Google OAuth not configured. Add client id/secret in Admin → Integrations.' })
  }
  if (!settings?.client_id || !settings?.client_secret) {
    throw createError({ statusCode: 500, message: 'Google OAuth client_id/client_secret missing.' })
  }

  // Always show consent when disconnected, no refresh_token, or client asked for it (e.g. after GBP 403).
  let promptConsent = forceConsent
  if (!promptConsent) {
    try {
      if (accountMode) {
        const u = await pb.collection('users').getOne<{ default_google_json?: { google?: { refresh_token?: string } } }>(userId)
        const rt = u?.default_google_json?.google?.refresh_token
        promptConsent = !rt
      } else {
        const list = await pb.collection('integrations').getFullList<{ status?: string; config_json?: { google?: { refresh_token?: string } } }>({
          filter: `site = "${siteId}" && provider = "${GOOGLE_ANCHOR}"`,
        })
        const rec = list[0]
        if (rec?.status === 'connected' && rec?.config_json?.google?.refresh_token) {
          promptConsent = false
        } else {
          promptConsent = true
        }
      }
    } catch {
      promptConsent = true
    }
  }

  const state = createState(secret, accountMode ? '' : siteId, userId, afterConnect, accountMode ? 'account' : 'site')
  const url = buildAuthUrl(settings, state, promptConsent)

  return { url }
})
