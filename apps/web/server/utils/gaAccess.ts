/**
 * Server-side: get GA access token and optional property for a site.
 * Refreshes token if expired. Throws if not connected or refresh fails.
 */

import type PocketBase from 'pocketbase'
import { refreshAccessToken } from '~/server/utils/googleOauth'

const GOOGLE_ANCHOR = 'google_analytics'

export interface GAIntegrationConfig {
  id: string
  config_json?: {
    google?: {
      access_token?: string
      refresh_token?: string
      expires_at?: string
    }
    property_id?: string
    property_name?: string
  }
}

export async function getGAAccessToken(
  pb: PocketBase,
  siteId: string
): Promise<{ accessToken: string; integration: GAIntegrationConfig }> {
  const list = await pb.collection('integrations').getFullList<GAIntegrationConfig>({
    filter: `site = "${siteId}" && provider = "${GOOGLE_ANCHOR}"`,
  })
  const anchor = list[0]
  if (!anchor?.config_json?.google) {
    throw createError({ statusCode: 400, message: 'Google Analytics not connected for this site.' })
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

  return { accessToken: accessToken!, integration: anchor }
}
