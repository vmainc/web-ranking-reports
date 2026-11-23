import { describe, expect, it } from 'vitest'
import {
  RANK_NOT_IN_TOP_STORAGE_POSITION,
  logicalRankFromStorage,
  storageRankForHistory,
} from '~/utils/rankPositionStorage'

describe('rankPositionStorage', () => {
  it('round-trips ranked positions', () => {
    expect(storageRankForHistory(8)).toBe(8)
    expect(logicalRankFromStorage(8)).toBe(8)
  })

  it('stores not-ranked as 101', () => {
    expect(storageRankForHistory(0, true)).toBe(RANK_NOT_IN_TOP_STORAGE_POSITION)
    expect(logicalRankFromStorage(RANK_NOT_IN_TOP_STORAGE_POSITION)).toBe(0)
  })
})