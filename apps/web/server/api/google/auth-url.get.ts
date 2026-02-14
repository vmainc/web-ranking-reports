import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { createState } from '~/server/utils/stateSign'
import { buildAuthUrl } from '~/server/utils/googleOauth'

const GOOGLE_ANCHOR = 'google_analytics'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const siteId = query.siteId as string
  if (!siteId) {
    throw createError({ statusCode: 400, message: 'siteId required' })
  }

  const config = useRuntimeConfig()
  const secret = config.stateSigningSecret as string
  if (!secret) {
    throw createError({ statusCode: 500, message: 'STATE_SIGNING_SECRET not set' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

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

  let promptConsent = true
  try {
    const list = await pb.collection('integrations').getFullList<{ config_json?: { google?: { refresh_token?: string } } }>({
      filter: `site = "${siteId}" && provider = "${GOOGLE_ANCHOR}"`,
    })
    if (list.length > 0 && list[0].config_json?.google?.refresh_token) {
      promptConsent = false
    }
  } catch {
    // no anchor yet → prompt consent to get refresh_token
  }

  const state = createState(secret, siteId, userId)
  const url = buildAuthUrl(settings, state, promptConsent)

  return { url }
})
