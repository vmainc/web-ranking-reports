import { rankPositionDisplay } from '~/utils/rankTrackingDisplay'

/** Shape of `rank_keywords.last_result_json` used when deciding report visibility. */
export type KeywordRankingSnapshot = {
  position?: number | null
  error?: string | null
  rankingStatus?: string | null
  errorType?: string | null
  contextStale?: boolean | null
  /** Set when a later check failed and the previous position was kept. */
  lastFetchError?: string | null
} | null | undefined

/**
 * Reports show the same rows the rank-tracking table labels with a position.
 * A failed re-check that kept the previous position still counts. Pending,
 * stale, and not-in-top-N rows do not.
 */
export function hasReportableKeywordRanking(snapshot: KeywordRankingSnapshot): boolean {
  if (!snapshot) return false
  return (
    rankPositionDisplay({
      position: typeof snapshot.position === 'number' ? snapshot.position : undefined,
      error: snapshot.error ?? undefined,
      rankingStatus: snapshot.rankingStatus ?? undefined,
      errorType: snapshot.errorType ?? undefined,
      contextStale: snapshot.contextStale === true,
      lastFetchError: snapshot.lastFetchError ?? undefined,
    }).kind === 'ranked'
  )
}

export function filterReportableRankKeywords<T extends { last_result_json?: KeywordRankingSnapshot }>(
  rows: T[],
): T[] {
  return rows.filter((row) => hasReportableKeywordRanking(row.last_result_json))
}
