/**
 * Rank movement between two checks. Lower position number = better (e.g. 5 beats 10).
 * Position 0 = not found in tracked SERP window.
 */

export type RankChangeDirection = 'up' | 'down' | 'same' | 'new' | 'lost' | 'none'

export interface RankMovement {
  previousPosition: number | null
  changeSpots: number | null
  changeDirection: RankChangeDirection
}

/**
 * @param previousPosition — position from the prior fetch (0 = not ranked)
 * @param currentPosition — position from this fetch
 * @param hadPriorFetch — false on the very first successful save for this keyword
 */
export function computeRankMovement(
  previousPosition: number | null | undefined,
  currentPosition: number,
  hadPriorFetch: boolean,
): RankMovement {
  if (!hadPriorFetch) {
    return { previousPosition: null, changeSpots: null, changeDirection: 'none' }
  }

  const prev = typeof previousPosition === 'number' ? previousPosition : 0
  const curr = typeof currentPosition === 'number' ? currentPosition : 0

  if (prev <= 0 && curr > 0) {
    return { previousPosition: prev, changeSpots: null, changeDirection: 'new' }
  }
  if (prev > 0 && curr <= 0) {
    return { previousPosition: prev, changeSpots: null, changeDirection: 'lost' }
  }
  if (prev > 0 && curr > 0) {
    const delta = prev - curr
    if (delta === 0) return { previousPosition: prev, changeSpots: 0, changeDirection: 'same' }
    if (delta > 0) return { previousPosition: prev, changeSpots: delta, changeDirection: 'up' }
    return { previousPosition: prev, changeSpots: Math.abs(delta), changeDirection: 'down' }
  }

  return { previousPosition: prev, changeSpots: null, changeDirection: 'same' }
}

/** Stored on each `keyword_rankings` row (append-only history). */
export type KeywordRankingDirection = 'up' | 'down' | 'same'

export interface KeywordRankingEntry {
  previous_rank: number | null
  rank: number
  change: number | null
  direction: KeywordRankingDirection
}

/**
 * Compare this check to the last saved row in `keyword_rankings`.
 * Lower rank number = better. change = previous_rank - current_rank (positive = moved up).
 * First check: no previous row → previous_rank and change null, direction "same".
 */
export function computeKeywordRankingEntry(
  lastSavedRank: number | null,
  currentRank: number,
): KeywordRankingEntry {
  if (lastSavedRank === null) {
    return { previous_rank: null, rank: currentRank, change: null, direction: 'same' }
  }
  const change = lastSavedRank - currentRank
  let direction: KeywordRankingDirection = 'same'
  if (change > 0) direction = 'up'
  else if (change < 0) direction = 'down'
  return { previous_rank: lastSavedRank, rank: currentRank, change, direction }
}
