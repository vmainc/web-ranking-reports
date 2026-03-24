/**
 * User-level default Google (Account page + dashboard calendar).
 */

export interface AccountGoogleStatus {
  connected: boolean
  email: string | null
  hasCalendarScope: boolean
  /** Calendars selected for the dashboard (may be empty until the user saves). */
  calendars: Array<{ id: string; summary: string }>
  /** True once the user has saved calendar selection (including an intentional empty list). */
  calendarSelectionConfigured: boolean
}

function authHeaders(): Record<string, string> {
  const pb = usePocketbase()
  const token = pb.authStore.token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export function useAccountGoogle() {
  async function getStatus(): Promise<AccountGoogleStatus> {
    return await $fetch<AccountGoogleStatus>('/api/account/google', {
      headers: authHeaders(),
    })
  }

  async function disconnect(): Promise<void> {
    await $fetch('/api/account/google/disconnect', {
      method: 'POST',
      headers: authHeaders(),
    })
  }

  async function getAuthUrl(forceConsent?: boolean): Promise<string> {
    const query: Record<string, string> = { mode: 'account' }
    if (forceConsent) query.forceConsent = '1'
    const { url } = await $fetch<{ url: string }>('/api/google/auth-url', {
      query,
      headers: authHeaders(),
    })
    return url
  }

  async function redirectToConnect(forceConsent?: boolean): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
      const url = await getAuthUrl(forceConsent)
      window.location.href = url
      return { ok: true }
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'data' in e && e.data && typeof (e.data as { message?: string }).message === 'string'
          ? (e.data as { message: string }).message
          : e instanceof Error
            ? e.message
            : 'Could not start Google sign-in.'
      return { ok: false, message: msg }
    }
  }

  async function copyDefaultToSite(siteId: string): Promise<void> {
    await $fetch('/api/google/copy-default-account', {
      method: 'POST',
      body: { siteId },
      headers: authHeaders(),
    })
  }

  async function getCalendars(): Promise<{
    calendars: Array<{ id: string; summary: string; primary?: boolean; accessRole?: string }>
  }> {
    return await $fetch('/api/account/google/calendars', {
      headers: authHeaders(),
    })
  }

  async function selectDashboardCalendars(calendars: Array<{ id: string; summary?: string }>): Promise<void> {
    await $fetch('/api/account/google/calendar-select', {
      method: 'POST',
      body: { calendars },
      headers: authHeaders(),
    })
  }

  async function selectCalendar(calendarId: string, calendarSummary?: string): Promise<void> {
    await selectDashboardCalendars([{ id: calendarId, summary: calendarSummary }])
  }

  async function getEvents(opts?: { timeMin?: string; timeMax?: string; maxResults?: number }): Promise<{
    calendarIds: string[]
    events: Array<{
      id: string
      summary: string
      htmlLink?: string
      start: string
      end: string
      calendarId: string
      calendarLabel: string
    }>
    timeMin: string
    timeMax: string
  }> {
    return await $fetch('/api/account/google/events', {
      query: {
        ...(opts?.timeMin && { timeMin: opts.timeMin }),
        ...(opts?.timeMax && { timeMax: opts.timeMax }),
        ...(opts?.maxResults != null && { maxResults: String(opts.maxResults) }),
      },
      headers: authHeaders(),
    })
  }

  return {
    getStatus,
    disconnect,
    getAuthUrl,
    redirectToConnect,
    copyDefaultToSite,
    getCalendars,
    selectCalendar,
    selectDashboardCalendars,
    getEvents,
  }
}
