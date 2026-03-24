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
  /** Legacy single selection; use `dashboard_calendars` when present. */
  calendar_id?: string
  calendar_summary?: string
  /** Dashboard: one or more calendars to merge on the main dashboard. */
  dashboard_calendars?: Array<{ id: string; summary?: string }>
}

/** Normalized list for API + events (deduped by calendar id). */
export function parseDashboardCalendars(json: UserDefaultGoogleJson): Array<{ id: string; summary: string }> {
  const arr = json.dashboard_calendars
  if (Array.isArray(arr)) {
    if (arr.length === 0) return []
    const out: Array<{ id: string; summary: string }> = []
    const seen = new Set<string>()
    for (const x of arr) {
      if (!x || typeof x !== 'object') continue
      const raw = typeof (x as { id?: string }).id === 'string' ? (x as { id: string }).id.trim() : ''
      if (!raw || seen.has(raw)) continue
      seen.add(raw)
      const summary =
        typeof (x as { summary?: string }).summary === 'string' ? (x as { summary: string }).summary.trim() : ''
      out.push({ id: raw, summary: summary || raw })
    }
    if (out.length) return out
  }
  const calendarId = typeof json.calendar_id === 'string' ? json.calendar_id.trim() : ''
  const calendarSummary = typeof json.calendar_summary === 'string' ? json.calendar_summary.trim() : ''
  if (calendarId) return [{ id: calendarId, summary: calendarSummary || calendarId }]
  return []
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
  const rawMs = expiresAt ? new Date(String(expiresAt)).getTime() : NaN
  const expiresMs = Number.isFinite(rawMs) ? rawMs : 0
  // If expires_at is missing, invalid, or past (60s skew), refresh when we have a refresh_token.
  const isExpiredOrUnknown =
    !expiresAt || !Number.isFinite(rawMs) || Date.now() >= expiresMs - 60 * 1000
  const needRefresh = !!refreshToken && (!accessToken || isExpiredOrUnknown)

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
