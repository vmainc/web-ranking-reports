/**
 * PocketBase required number fields reject 0 as "missing".
 * Store "not in tracked depth" as 101 in history collections; logical rank stays 0 in last_result_json.
 */
export const RANK_NOT_IN_TOP_STORAGE_POSITION = 101

export function isStoredNotRankedPosition(value: number): boolean {
  return value === RANK_NOT_IN_TOP_STORAGE_POSITION
}

/** Map stored snapshot/ranking row → logical position for charts and movement math. */
export function logicalRankFromStorage(stored: number): number {
  if (isStoredNotRankedPosition(stored)) return 0
  return stored
}

/** Map logical position → value safe for PocketBase create on history collections. */
export function storageRankForHistory(logicalRank: number, conclusiveNotRanked = false): number {
  if (typeof logicalRank === 'number' && logicalRank > 0) return logicalRank
  if (conclusiveNotRanked || logicalRank === 0) return RANK_NOT_IN_TOP_STORAGE_POSITION
  return RANK_NOT_IN_TOP_STORAGE_POSITION
}