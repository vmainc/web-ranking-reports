/**
 * Ranking check status vocabulary.
 * API failures must NEVER be persisted/displayed as legitimate "not ranking".
 */

export type RankingCheckStatus =
  | 'ranked'
  | 'not_ranked_within_tracked_depth'
  | 'api_error'
  | 'incomplete'
  | 'parsing_error'
  | 'pending'

/** Legacy errorType values still accepted when reading older last_result_json rows. */
export type LegacySerpErrorType = 'api' | 'not_ranked' | 'incomplete' | 'parsing'

export function isTransientRankingFailure(status: RankingCheckStatus | undefined): boolean {
  return status === 'api_error' || status === 'incomplete' || status === 'parsing_error' || status === 'pending'
}

/**
 * Resolve ranking status from a stored last_result_json (new + legacy shapes).
 */
export function resolveStoredRankingStatus(row: {
  rankingStatus?: RankingCheckStatus | string | null
  errorType?: LegacySerpErrorType | string | null
  error?: string | null
  position?: number | null
} | null | undefined): RankingCheckStatus | null {
  if (!row) return null
  const status = row.rankingStatus
  if (
    status === 'ranked' ||
    status === 'not_ranked_within_tracked_depth' ||
    status === 'api_error' ||
    status === 'incomplete' ||
    status === 'parsing_error' ||
    status === 'pending'
  ) {
    return status
  }

  if (row.errorType === 'api') return 'api_error'
  if (row.errorType === 'incomplete') return 'incomplete'
  if (row.errorType === 'parsing') return 'parsing_error'
  if (row.errorType === 'not_ranked') return 'not_ranked_within_tracked_depth'

  if (typeof row.position === 'number' && row.position > 0 && !row.error) return 'ranked'

  if (row.error) {
    const msg = String(row.error).toLowerCase()
    if (msg.includes('not found in top') || msg.includes('not in top')) {
      return 'not_ranked_within_tracked_depth'
    }
    return 'api_error'
  }

  if (typeof row.position === 'number' && row.position === 0) {
    return 'not_ranked_within_tracked_depth'
  }

  return null
}

export function rankingStatusLabel(status: RankingCheckStatus | null | undefined, trackedDepth = 100): string {
  switch (status) {
    case 'ranked':
      return 'Ranked'
    case 'not_ranked_within_tracked_depth':
      return `Not in top ${trackedDepth}`
    case 'api_error':
      return 'Check failed'
    case 'incomplete':
      return 'Incomplete check'
    case 'parsing_error':
      return 'Parse error'
    case 'pending':
      return 'Pending'
    default:
      return '—'
  }
}
