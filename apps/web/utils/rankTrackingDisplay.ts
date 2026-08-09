/** Display helpers for rank-tracking rows on site pages and in reports. */

export interface RankResultJson {
  position?: number
  url?: string
  title?: string
  changeDirection?: 'up' | 'down' | 'same' | 'new' | 'lost' | 'none'
  changeSpots?: number | null
  error?: string
  rankingStatus?: string
  lastFetchError?: string
  errorType?: string
  contextStale?: boolean
}

const TRACKED_DEPTH = 100

/**
 * Position cell label. Distinguishes ranked / not-in-top-N / transient errors.
 * Never treats position 0 as falsy-hidden when status is conclusive not-ranked.
 */
export function rankPositionDisplay(
  result: RankResultJson | null | undefined,
  trackedDepth = TRACKED_DEPTH,
): { kind: 'ranked' | 'not_ranked' | 'error' | 'empty' | 'pending'; label: string; title?: string } {
  if (!result) return { kind: 'empty', label: '—' }

  if (result.contextStale === true || result.rankingStatus === 'pending') {
    return {
      kind: 'pending',
      label: '…',
      title: 'Refreshing rankings for the current tracking location…',
    }
  }

  const status = result.rankingStatus
  const hasPositivePosition = typeof result.position === 'number' && result.position > 0

  // Prefer showing a known-good position (including rows preserved after a transient failure).
  if (hasPositivePosition && (status === 'ranked' || status == null || status === 'api_error' || status === 'incomplete' || status === 'parsing_error')) {
    if (status === 'ranked' || !result.error || result.lastFetchError) {
      const title = result.lastFetchError
        ? `Last check failed (${result.lastFetchError}); showing previous rank`
        : undefined
      return { kind: 'ranked', label: `#${result.position}`, title }
    }
  }

  if (status === 'ranked' && hasPositivePosition) {
    return { kind: 'ranked', label: `#${result.position}` }
  }

  if (
    status === 'not_ranked_within_tracked_depth' ||
    result.errorType === 'not_ranked' ||
    (typeof result.position === 'number' &&
      result.position === 0 &&
      !result.error &&
      status !== 'api_error' &&
      status !== 'incomplete' &&
      status !== 'parsing_error')
  ) {
    return {
      kind: 'not_ranked',
      label: `${trackedDepth}+`,
      title: `Not found in top ${trackedDepth} organic results`,
    }
  }

  // Legacy rows stored not-ranked as an error string — do not show as check failure.
  if (
    result.error &&
    /not found in top|not in top/i.test(result.error) &&
    (result.position === 0 || result.position == null)
  ) {
    return {
      kind: 'not_ranked',
      label: `${trackedDepth}+`,
      title: `Not found in top ${trackedDepth} organic results`,
    }
  }

  if (
    status === 'api_error' ||
    status === 'incomplete' ||
    status === 'parsing_error' ||
    result.error ||
    result.lastFetchError
  ) {
    const msg = result.lastFetchError || result.error || 'Ranking check failed'
    return { kind: 'error', label: 'Error', title: msg }
  }

  if (hasPositivePosition) {
    return { kind: 'ranked', label: `#${result.position}` }
  }

  return { kind: 'empty', label: '—' }
}

export function rankChangeLabel(result: RankResultJson | null | undefined): string {
  const dir = result?.changeDirection
  const spots = result?.changeSpots
  if (dir === 'up' && typeof spots === 'number') return `▲ +${spots}`
  if (dir === 'down' && typeof spots === 'number') return `▼ -${spots}`
  if (dir === 'new') return 'New ranking'
  if (dir === 'lost') return 'Lost ranking'
  if (dir === 'same' && spots === 0) return 'No change'
  return '—'
}

export function rankChangeClass(result: RankResultJson | null | undefined): string {
  const dir = result?.changeDirection
  if (dir === 'up' || dir === 'new') return 'font-medium text-emerald-700'
  if (dir === 'down' || dir === 'lost') return 'font-medium text-red-700'
  return 'text-surface-500'
}

export function rankUrlPath(url: string): string {
  try {
    const u = new URL(url)
    return `${u.pathname}${u.search || ''}` || '/'
  } catch {
    return url
  }
}
