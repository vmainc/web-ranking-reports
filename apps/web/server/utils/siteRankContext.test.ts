import { describe, expect, it } from 'vitest'
import {
  resolveSiteRankContext,
  rankingIdentitiesEqual,
  rankingIdentityFromContext,
  isResultCurrentForContext,
  normalizeSiteRankTrackingConfig,
  extractRankingIdentity,
  DEFAULT_SITE_RANK_TRACKING_CONFIG,
} from '~/server/utils/siteRankContext'
import { computeRankMovement, computeKeywordRankingEntry } from '~/server/utils/rankTrackingChange'
import { searchDfsLocations, type DfsLocationRow } from '~/server/utils/dataforseoLocations'
import { buildCompactSerpSummary } from '~/server/utils/serpSummary'
import { DEFAULT_RANK_TRACKING_CRON_EXPRESSION } from '~/server/utils/rankTrackingCronDefaults'
import { hostsMatch } from '~/server/utils/rankingDomain'
import {
  buildSerpLiveTaskBody,
  parseSerpRankResponse,
  MIN_ORGANIC_FOR_CONFIDENT_ABSENCE,
} from '~/server/utils/dataforseo'

describe('resolveSiteRankContext', () => {
  it('defaults to US desktop google', () => {
    const ctx = resolveSiteRankContext({})
    expect(ctx.locationCode).toBe(2840)
    expect(ctx.locationName).toBe('United States')
    expect(ctx.device).toBe('desktop')
    expect(ctx.languageCode).toBe('en')
    expect(ctx.searchEngine).toBe('google')
    expect(ctx.includeSubdomains).toBe(true)
  })

  it('resolves Kansas City from site config', () => {
    const ctx = resolveSiteRankContext({
      rank_tracking_config: {
        location_code: 1015662,
        location_name: 'Kansas City,Missouri,United States',
        language_code: 'en',
        device: 'desktop',
        include_subdomains: true,
        search_engine: 'google',
      },
    })
    expect(ctx.locationCode).toBe(1015662)
    expect(ctx.locationName).toContain('Kansas City')
  })
})

describe('ranking identity / movement', () => {
  it('does not invent movement across US → Kansas City', () => {
    const us = { locationCode: 2840, languageCode: 'en', device: 'desktop' as const, searchEngine: 'google' as const }
    const kc = { locationCode: 1015662, languageCode: 'en', device: 'desktop' as const, searchEngine: 'google' as const }
    expect(rankingIdentitiesEqual(us, kc)).toBe(false)

    const movement = computeRankMovement(47, 6, true, false)
    expect(movement.changeSpots).toBeNull()
    expect(movement.changeDirection).toBe('none')
    expect(movement.previousPosition).toBeNull()

    const entry = computeKeywordRankingEntry(47, 6, false)
    expect(entry.previous_rank).toBeNull()
    expect(entry.change).toBeNull()
  })

  it('still computes movement within the same identity', () => {
    const m = computeRankMovement(47, 6, true, true)
    expect(m.changeDirection).toBe('up')
    expect(m.changeSpots).toBe(41)
  })

  it('treats stale prior as not current for context', () => {
    const ctx = resolveSiteRankContext({
      rank_tracking_config: { location_code: 1015662, location_name: 'Kansas City,Missouri,United States' },
    })
    expect(
      isResultCurrentForContext(
        {
          position: 47,
          location_code: 2840,
          language_code: 'en',
          device: 'desktop',
          search_engine: 'google',
          contextStale: true,
        },
        ctx,
      ),
    ).toBe(false)
  })

  it('extracts identity from stored rows', () => {
    expect(
      extractRankingIdentity({
        location_code: 2840,
        language_code: 'en',
        device: 'desktop',
        search_engine: 'google',
      }),
    ).toEqual({
      locationCode: 2840,
      languageCode: 'en',
      device: 'desktop',
      searchEngine: 'google',
    })
  })
})

describe('subdomain matching modes', () => {
  it('include_subdomains true/false', () => {
    expect(hostsMatch('blog.example.com', 'example.com', { mode: 'include_subdomains' })).toBe(true)
    expect(hostsMatch('blog.example.com', 'example.com', { mode: 'www_equivalent' })).toBe(false)
    expect(hostsMatch('www.example.com', 'example.com', { mode: 'www_equivalent' })).toBe(true)
    expect(hostsMatch('notexample.com', 'example.com', { mode: 'include_subdomains' })).toBe(false)
    expect(hostsMatch('example.wordpress.com', 'example.com', { mode: 'include_subdomains' })).toBe(false)
  })
})

describe('full SERP incomplete vs not ranked', () => {
  function makeArgs(overrides: Record<string, unknown> = {}) {
    return {
      keyword: 'plumber',
      targetDomain: 'example.com',
      normalizedHostname: 'example.com',
      dataForSeoTarget: '*example.com*',
      locationCode: 2840,
      locationLabel: 'United States',
      languageCode: 'en',
      device: 'desktop',
      os: 'windows',
      depth: 100,
      includeSubdomains: true,
      usedApiTargetFilter: false,
      fetchedAt: '2026-08-09T12:00:00.000Z',
      httpStatus: 200,
      durationMs: 10,
      includeDebug: false,
      ...overrides,
    }
  }

  it('marks incomplete when organic count is thin (no target)', () => {
    const items = Array.from({ length: MIN_ORGANIC_FOR_CONFIDENT_ABSENCE - 1 }, (_, i) => ({
      type: 'organic',
      rank_group: i + 1,
      domain: 'other.com',
      url: `https://other.com/${i}`,
    }))
    const result = parseSerpRankResponse(
      {
        status_code: 20000,
        tasks: [{ status_code: 20000, result: [{ items }] }],
      } as Parameters<typeof parseSerpRankResponse>[0],
      makeArgs(),
    )
    expect(result.rankingStatus).toBe('incomplete')
  })

  it('production path does not require target for ranked detection', () => {
    const items = [
      { type: 'paid', rank_group: 1, domain: 'ad.com', url: 'https://ad.com' },
      { type: 'local_pack', rank_group: 1, domain: 'example.com', url: 'https://example.com', title: 'Biz' },
      {
        type: 'organic',
        rank_group: 14,
        rank_absolute: 20,
        domain: 'example.com',
        url: 'https://example.com/services',
      },
    ]
    const result = parseSerpRankResponse(
      {
        status_code: 20000,
        tasks: [{ status_code: 20000, result: [{ items, location_code: 2840 }] }],
      } as Parameters<typeof parseSerpRankResponse>[0],
      makeArgs({ usedApiTargetFilter: false }),
    )
    expect(result.rankingStatus).toBe('ranked')
    expect(result.position).toBe(14)
    expect(result.serpSummary?.serpFeatureTypes).toContain('local_pack')
    expect(result.serpSummary?.organicTopDomains[0]?.rankGroup).toBe(14)
  })
})

describe('searchDfsLocations', () => {
  const catalog: DfsLocationRow[] = [
    {
      location_code: 2840,
      location_name: 'United States',
      country_iso_code: 'US',
      location_type: 'Country',
    },
    {
      location_code: 1015662,
      location_name: 'Kansas City,Missouri,United States',
      country_iso_code: 'US',
      location_type: 'City',
    },
    {
      location_code: 999,
      location_name: 'Kansas City,Kansas,United States',
      country_iso_code: 'US',
      location_type: 'City',
    },
  ]

  it('finds Kansas City cities', () => {
    const hits = searchDfsLocations(catalog, 'Kansas City', { countryIso: 'US' })
    expect(hits.some((h) => h.location_code === 1015662)).toBe(true)
    expect(hits.every((h) => h.country_iso_code === 'US')).toBe(true)
  })
})

describe('serp summary', () => {
  it('keeps compact competitor + feature metadata', () => {
    const summary = buildCompactSerpSummary([
      { type: 'organic', rank_group: 1, domain: 'a.com', url: 'https://a.com' },
      { type: 'local_pack', rank_group: 1, title: 'Biz', domain: 'example.com', cid: 'cid123', phone: '555' },
      { type: 'people_also_ask', rank_group: 1 },
    ])
    expect(summary.organicTopDomains).toHaveLength(1)
    expect(summary.serpFeatureTypes).toEqual(['local_pack', 'organic', 'people_also_ask'])
    expect(summary.localPack?.[0]?.cid).toBe('cid123')
  })
})

describe('scheduler defaults', () => {
  it('runs Tuesday and Friday at 06:00', () => {
    // cron: minute hour dom month dow — 0 6 * * 2,5
    expect(DEFAULT_RANK_TRACKING_CRON_EXPRESSION).toBe('0 6 * * 2,5')
  })
})

describe('buildSerpLiveTaskBody', () => {
  it('omits target for production (useApiTargetFilter false/undefined)', () => {
    const body = buildSerpLiveTaskBody({
      keyword: 'plumber',
      locationCode: 2840,
      languageCode: 'en',
      device: 'desktop',
      os: 'windows',
      depth: 100,
      dataForSeoTarget: '*example.com*',
      useApiTargetFilter: false,
    })
    expect(body[0]).not.toHaveProperty('target')
    expect(body[0]!.depth).toBe(100)
  })

  it('includes target only when explicitly requested (diagnose)', () => {
    const body = buildSerpLiveTaskBody({
      keyword: 'plumber',
      locationCode: 2840,
      languageCode: 'en',
      device: 'desktop',
      os: 'windows',
      depth: 100,
      dataForSeoTarget: '*example.com*',
      useApiTargetFilter: true,
    })
    expect(body[0]!.target).toBe('*example.com*')
  })
})

describe('normalizeSiteRankTrackingConfig', () => {
  it('fills defaults for partial configs', () => {
    const c = normalizeSiteRankTrackingConfig({ location_code: 2840 })
    expect(c.location_name).toBe(DEFAULT_SITE_RANK_TRACKING_CONFIG.location_name)
    expect(c.device).toBe('desktop')
    expect(rankingIdentityFromContext(resolveSiteRankContext({ rank_tracking_config: c })).locationCode).toBe(2840)
  })
})
