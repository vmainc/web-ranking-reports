import type { BacklinksProfile } from '~/types/backlinks'
import { isBacklinksProfile } from '~/types/backlinks'

export type LoadBacklinksOptions = {
  /** GET with live DataForSEO when cache is empty. */
  fetchIfMissing?: boolean
  /** GET always runs a live fetch. */
  refresh?: boolean
  /** With fetchIfMissing, refetch when snapshot is older than N days. */
  maxAgeDays?: number
}

export function useBacklinksProfile() {
  const { getHeaders } = useReportAuth()

  async function loadLatest(siteId: string, opts: LoadBacklinksOptions = {}): Promise<BacklinksProfile | null> {
    const query: Record<string, string> = {}
    if (opts.refresh) query.refresh = '1'
    if (opts.fetchIfMissing) query.fetchIfMissing = '1'
    if (opts.maxAgeDays != null && opts.maxAgeDays > 0) query.maxAgeDays = String(opts.maxAgeDays)

    const raw = await $fetch<unknown>(`/api/sites/${siteId}/backlinks/latest`, {
      headers: getHeaders(),
      query,
    }).catch(() => null)
    return isBacklinksProfile(raw) ? raw : null
  }

  async function refreshLive(siteId: string): Promise<BacklinksProfile> {
    const raw = await $fetch<unknown>(`/api/sites/${siteId}/backlinks/fetch`, {
      method: 'POST',
      headers: getHeaders(),
    })
    if (!isBacklinksProfile(raw)) {
      throw new Error('Invalid backlinks response')
    }
    return raw
  }

  return { loadLatest, refreshLive }
}
