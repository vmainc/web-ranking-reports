/**
 * Server-side: get Google Ads access token and developer token for a site.
 * Uses the same anchor (google_analytics) as other Google integrations.
 */

import type PocketBase from 'pocketbase'
import { refreshAccessToken } from '~/server/utils/googleOauth'

const GOOGLE_ANCHOR = 'google_analytics'

export interface AdsIntegrationConfig {
  id: string
  config_json?: {
    google?: {
      access_token?: string
      refresh_token?: string
      expires_at?: string
    }
    ads_customer_id?: string
    ads_customer_name?: string
    /** Manager (MCC) customer ID — required when the selected account is under an MCC */
    ads_login_customer_id?: string
  }
}

export async function getAdsAccessToken(
  pb: PocketBase,
  siteId: string
): Promise<{ accessToken: string; integration: AdsIntegrationConfig }> {
  const list = await pb.collection('integrations').getFullList<AdsIntegrationConfig>({
    filter: `site = "${siteId}" && provider = "${GOOGLE_ANCHOR}"`,
  })
  const anchor = list[0]
  if (!anchor?.config_json?.google) {
    throw createError({ statusCode: 400, message: 'Google not connected for this site. Connect Google (including Google Ads) from Integrations.' })
  }

  const google = anchor.config_json.google
  let accessToken = google.access_token
  let expiresAt = google.expires_at
  const refreshToken = google.refresh_token
  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : 0
  const needRefresh = refreshToken && Date.now() >= expiresMs - 60 * 1000

  if (needRefresh) {
    const row = await pb.collection('app_settings').getFirstListItem<{ value: { client_id: string; client_secret: string; redirect_uri: string } }>('key="google_oauth"')
    const settings = row?.value
    if (!settings) throw createError({ statusCode: 503, message: 'Google OAuth not configured.' })
    const refreshed = await refreshAccessToken(settings, refreshToken)
    accessToken = refreshed.access_token
    const newExpires = refreshed.expires_in
      ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString()
    await pb.collection('integrations').update(anchor.id, {
      config_json: {
        ...anchor.config_json,
        google: {
          ...google,
          access_token: accessToken,
          expires_at: newExpires,
        },
      },
    })
  }

  if (!accessToken || typeof accessToken !== 'string' || !accessToken.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Google access token missing. Disconnect and reconnect Google from the site Integrations page.',
    })
  }
  return { accessToken, integration: anchor }
}

export async function getDeveloperToken(pb: PocketBase): Promise<string> {
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value: { developer_token?: string } }>('key="google_ads"')
    const token = row?.value?.developer_token ?? ''
    return token
  } catch {
    return ''
  }
}
