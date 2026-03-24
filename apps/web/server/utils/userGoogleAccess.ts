/**
 * User-level default Google OAuth (users.default_google_json): token refresh for account + dashboard calendar.
 */

import type PocketBase from 'pocketbase'
import { refreshAccessToken } from '~/server/utils/googleOauth'

export interface UserDefaultGoogleJson {
  google?: {
    access_token?: string
    refresh_token?: string
    expires_at?: string
    scope?: string
    email?: string
    google_sub?: string
  }
  calendar_id?: string
  calendar_summary?: string
}

export async function getUserDefaultGoogleAccessToken(
  pb: PocketBase,
  userId: string
): Promise<{ accessToken: string; json: UserDefaultGoogleJson }> {
  const row = await pb.collection('users').getOne<{ id: string; default_google_json?: UserDefaultGoogleJson }>(userId)
  const json = row?.default_google_json ?? {}
  const google = json.google
  if (!google?.access_token && !google?.refresh_token) {
    throw createError({ statusCode: 400, message: 'No default Google account connected. Connect Google under Account.' })
  }

  let accessToken = google.access_token
  const refreshToken = google.refresh_token
  const expiresAt = google.expires_at
  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : 0
  const needRefresh =
    !!refreshToken && (!accessToken || Date.now() >= expiresMs - 60 * 1000)

  if (needRefresh) {
    const rowSettings = await pb.collection('app_settings').getFirstListItem<{
      value: { client_id: string; client_secret: string; redirect_uri: string }
    }>('key="google_oauth"')
    const settings = rowSettings?.value
    if (!settings) throw createError({ statusCode: 503, message: 'Google OAuth not configured.' })
    const refreshed = await refreshAccessToken(settings, refreshToken)
    accessToken = refreshed.access_token
    const newExpires = refreshed.expires_in
      ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString()
    const nextJson: UserDefaultGoogleJson = {
      ...json,
      google: {
        ...google,
        access_token: accessToken,
        expires_at: newExpires,
      },
    }
    await pb.collection('users').update(userId, { default_google_json: nextJson })
    return { accessToken: accessToken!, json: nextJson }
  }

  return { accessToken: accessToken!, json }
}
