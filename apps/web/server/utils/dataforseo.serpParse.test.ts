import { describe, expect, it } from 'vitest'
import {
  parseSerpRankResponse,
  MIN_ORGANIC_FOR_CONFIDENT_ABSENCE,
  RANK_TRACKING_SERP_DEPTH,
} from '~/server/utils/dataforseo'

function makeArgs(overrides: Record<string, unknown> = {}) {
  return {
    keyword: 'kansas city plumber',
    targetDomain: 'example.com',
    normalizedHostname: 'example.com',
    dataForSeoTarget: '*example.com*',
    locationCode: 2840,
    locationLabel: 'United States',
    languageCode: 'en',
    device: 'desktop',
    os: 'windows',
    depth: RANK_TRACKING_SERP_DEPTH,
    includeSubdomains: true,
    usedApiTargetFilter: true,
    fetchedAt: '2026-08-09T12:00:00.000Z',
    httpStatus: 200,
    durationMs: 100,
    includeDebug: true,
    ...overrides,
  }
}

function organic(rank_group: number, url: string, domain = 'example.com') {
  return {
    type: 'organic',
    rank_group,
    rank_absolute: rank_group + 2,
    domain,
    url,
    title: `T${rank_group}`,
  }
}

describe('parseSerpRankResponse', () => {
  it('selects best organic rank_group for tracked domain', () => {
    const data = {
      status_code: 20000,
      tasks: [
        {
          status_code: 20000,
          result: [
            {
              location_code: 2840,
              items: [
                { type: 'paid', rank_group: 1, rank_absolute: 1, domain: 'example.com', url: 'https://example.com/ad' },
                organic(31, 'https://example.com/blog'),
                organic(8, 'https://example.com/services'),
              ],
            },
          ],
        },
      ],
    }
    const result = parseSerpRankResponse(data as Parameters<typeof parseSerpRankResponse>[0], makeArgs())
    expect(result.rankingStatus).toBe('ranked')
    expect(result.position).toBe(8)
    expect(result.url).toContain('/services')
    expect(result.additionalMatches?.[0]?.position).toBe(31)
    expect(result.error).toBeUndefined()
    expect(result.debug?.resolvedLocationCode).toBe(2840)
  })

  it('marks not_ranked when target filter returns no matches', () => {
    const data = {
      status_code: 20000,
      tasks: [{ status_code: 20000, result: [{ items: [], location_code: 2840 }] }],
    }
    const result = parseSerpRankResponse(data as Parameters<typeof parseSerpRankResponse>[0], makeArgs({ usedApiTargetFilter: true }))
    expect(result.rankingStatus).toBe('not_ranked_within_tracked_depth')
    expect(result.position).toBe(0)
    expect(result.error).toBeUndefined()
    expect(result.errorType).toBe('not_ranked')
  })

  it('marks incomplete (not not_ranked) when full SERP has too few organics', () => {
    const few = Array.from({ length: MIN_ORGANIC_FOR_CONFIDENT_ABSENCE - 1 }, (_, i) =>
      organic(i + 1, `https://other.com/${i}`, 'other.com'),
    )
    const data = {
      status_code: 20000,
      tasks: [{ status_code: 20000, result: [{ items: few }] }],
    }
    const result = parseSerpRankResponse(data as Parameters<typeof parseSerpRankResponse>[0], makeArgs({ usedApiTargetFilter: false }))
    expect(result.rankingStatus).toBe('incomplete')
    expect(result.errorType).toBe('incomplete')
    expect(result.error).toMatch(/Incomplete SERP/)
  })

  it('marks api_error on DataForSEO task failure — never not_ranked', () => {
    const data = {
      status_code: 20000,
      tasks: [{ status_code: 40000, status_message: 'Task error', result: [] }],
    }
    const result = parseSerpRankResponse(data as Parameters<typeof parseSerpRankResponse>[0], makeArgs())
    expect(result.rankingStatus).toBe('api_error')
    expect(result.errorType).toBe('api')
    expect(result.error).toMatch(/Task error/)
  })

  it('marks api_error on envelope failure', () => {
    const data = { status_code: 40100, status_message: 'Auth failed', tasks: [] }
    const result = parseSerpRankResponse(data as Parameters<typeof parseSerpRankResponse>[0], makeArgs())
    expect(result.rankingStatus).toBe('api_error')
  })

  it('marks parsing_error on null body', () => {
    const result = parseSerpRankResponse(null, makeArgs())
    expect(result.rankingStatus).toBe('parsing_error')
    expect(result.errorType).toBe('parsing')
  })

  it('preserves location code through the pipeline', () => {
    const data = {
      status_code: 20000,
      tasks: [
        {
          status_code: 20000,
          result: [{ location_code: 1015662, items: [organic(5, 'https://example.com/')] }],
        },
      ],
    }
    const result = parseSerpRankResponse(
      data as Parameters<typeof parseSerpRankResponse>[0],
      makeArgs({ locationCode: 1015662, locationLabel: 'Kansas City,Missouri,United States' }),
    )
    expect(result.debug?.requestedLocationCode).toBe(1015662)
    expect(result.debug?.resolvedLocationCode).toBe(1015662)
    expect(result.position).toBe(5)
  })
})
