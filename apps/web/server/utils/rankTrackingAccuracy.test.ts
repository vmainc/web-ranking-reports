import { describe, expect, it } from 'vitest'
import { normalizeTrackedKeyword, normalizeKeywordList } from '~/server/utils/keywordNormalize'
import { rankPositionDisplay } from '~/utils/rankTrackingDisplay'
import { hasReportableKeywordRanking } from '~/utils/rankKeywordReport'
import { isTransientRankingFailure, resolveStoredRankingStatus } from '~/server/utils/rankingStatus'

describe('normalizeTrackedKeyword', () => {
  it('trims and collapses whitespace without altering query chars', () => {
    expect(normalizeTrackedKeyword('  kansas   city  plumber  ')).toBe('kansas city plumber')
    expect(normalizeTrackedKeyword("o'reilly & sons — plumbing")).toBe("o'reilly & sons — plumbing")
    expect(normalizeTrackedKeyword('café\nhyphen-word')).toBe('café hyphen-word')
    expect(normalizeTrackedKeyword('   ')).toBeNull()
    expect(normalizeTrackedKeyword('\n\t')).toBeNull()
  })

  it('dedupes case-insensitively in lists', () => {
    const { keywords } = normalizeKeywordList(['Foo', 'foo', '  Bar  ', ''])
    expect(keywords).toEqual(['Foo', 'Bar'])
  })
})

describe('rankPositionDisplay', () => {
  it('shows #N for ranked', () => {
    expect(rankPositionDisplay({ position: 14, rankingStatus: 'ranked' })).toEqual({
      kind: 'ranked',
      label: '#14',
    })
  })

  it('shows 100+ for not ranked (not Error)', () => {
    const d = rankPositionDisplay({ position: 0, rankingStatus: 'not_ranked_within_tracked_depth' })
    expect(d.kind).toBe('not_ranked')
    expect(d.label).toBe('100+')
  })

  it('shows Error for api failures even if position is 0', () => {
    const d = rankPositionDisplay({
      position: 0,
      rankingStatus: 'api_error',
      error: 'timeout',
    })
    expect(d.kind).toBe('error')
    expect(d.label).toBe('Error')
  })

  it('does not treat position 0 as ranked via falsy bugs', () => {
    // Legacy: position 0 with "Not found" error → not_ranked
    const d = rankPositionDisplay({
      position: 0,
      error: 'Not found in top results',
      errorType: 'not_ranked',
    })
    expect(d.kind).toBe('not_ranked')
  })
})

describe('hasReportableKeywordRanking', () => {
  it('requires real positive position', () => {
    expect(hasReportableKeywordRanking({ position: 7, rankingStatus: 'ranked' })).toBe(true)
    expect(hasReportableKeywordRanking({ position: 0, rankingStatus: 'not_ranked_within_tracked_depth' })).toBe(
      false,
    )
    expect(hasReportableKeywordRanking({ position: 5, rankingStatus: 'api_error', error: 'x' })).toBe(false)
  })
})

describe('rankingStatus helpers', () => {
  it('classifies transient failures', () => {
    expect(isTransientRankingFailure('api_error')).toBe(true)
    expect(isTransientRankingFailure('incomplete')).toBe(true)
    expect(isTransientRankingFailure('not_ranked_within_tracked_depth')).toBe(false)
    expect(isTransientRankingFailure('ranked')).toBe(false)
  })

  it('resolves legacy stored shapes', () => {
    expect(resolveStoredRankingStatus({ errorType: 'api', error: 'fail', position: 0 })).toBe('api_error')
    expect(resolveStoredRankingStatus({ errorType: 'not_ranked', position: 0 })).toBe(
      'not_ranked_within_tracked_depth',
    )
    expect(resolveStoredRankingStatus({ position: 3 })).toBe('ranked')
  })
})
