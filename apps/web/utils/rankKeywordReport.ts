/** Shape of `rank_keywords.last_result_json` used when deciding report visibility. */
export type KeywordRankingSnapshot = {
  position?: number | null
  error?: string | null
  rankingStatus?: string | null
  errorType?: string | null
  contextStale?: boolean | null
} | null | undefined

/**
 * Reports only show keywords with a real organic ranking (position > 0, no fetch error).
 * Matches server-side `priorHasRanking` in rankTrackingFetch.
 */
export function hasReportableKeywordRanking(snapshot: KeywordRankingSnapshot): boolean {
  if (!snapshot || snapshot.contextStale === true) return false
  if (snapshot.rankingStatus === 'pending') return false
  if (!snapshot || typeof snapshot.position !== 'number' || snapshot.position <= 0) return false
  if (snapshot.rankingStatus === 'ranked') return true
  if (snapshot.rankingStatus && snapshot.rankingStatus !== 'ranked') return false
  return !snapshot.error
}

export function filterReportableRankKeywords<T extends { last_result_json?: KeywordRankingSnapshot }>(
  rows: T[],
): T[] {
  return rows.filter((row) => hasReportableKeywordRanking(row.last_result_json))
}
