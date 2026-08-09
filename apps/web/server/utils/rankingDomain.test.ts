import { describe, expect, it } from 'vitest'
import {
  normalizeRankingHostname,
  hostsMatch,
  buildDataForSeoTarget,
  selectOrganicDomainMatches,
} from '~/server/utils/rankingDomain'

describe('normalizeRankingHostname', () => {
  it('normalizes common variants to the same host', () => {
    const expected = 'example.com'
    expect(normalizeRankingHostname('example.com')).toBe(expected)
    expect(normalizeRankingHostname('www.example.com')).toBe(expected)
    expect(normalizeRankingHostname('https://example.com')).toBe(expected)
    expect(normalizeRankingHostname('http://www.example.com/')).toBe(expected)
    expect(normalizeRankingHostname('https://www.example.com/page/')).toBe(expected)
    expect(normalizeRankingHostname('example.com/page')).toBe(expected)
    expect(normalizeRankingHostname('HTTPS://Example.COM/foo?x=1#y')).toBe(expected)
  })

  it('handles uppercase and trailing slashes', () => {
    expect(normalizeRankingHostname('WWW.Example.Com///')).toBe('example.com')
  })
})

describe('buildDataForSeoTarget', () => {
  it('never uses homepage-only target (bare domain)', () => {
    expect(buildDataForSeoTarget('example.com')).toBe('*example.com*')
    expect(buildDataForSeoTarget('https://www.example.com/path')).toBe('*example.com*')
    expect(buildDataForSeoTarget('example.com', { includeSubdomains: false })).toBe('example.com*')
  })
})

describe('hostsMatch', () => {
  it('treats www and apex as the same under include_subdomains', () => {
    expect(hostsMatch('www.example.com', 'example.com')).toBe(true)
    expect(hostsMatch('https://example.com/page', 'www.example.com')).toBe(true)
  })

  it('includes child subdomains of the tracked host', () => {
    expect(hostsMatch('blog.example.com', 'example.com')).toBe(true)
    expect(hostsMatch('shop.example.com', 'example.com')).toBe(true)
  })

  it('does not match unrelated hosts that merely contain the label', () => {
    expect(hostsMatch('example.wordpress.com', 'example.com')).toBe(false)
    expect(hostsMatch('notexample.com', 'example.com')).toBe(false)
  })

  it('exact_hostname mode rejects subdomains', () => {
    expect(hostsMatch('blog.example.com', 'example.com', { mode: 'exact_hostname' })).toBe(false)
    expect(hostsMatch('example.com', 'example.com', { mode: 'exact_hostname' })).toBe(true)
  })
})

describe('selectOrganicDomainMatches', () => {
  const serp = [
    { type: 'paid', rank_group: 1, rank_absolute: 1, domain: 'ads.example.com', url: 'https://ads.example.com/' },
    { type: 'local_pack', rank_group: 1, rank_absolute: 2, domain: 'example.com', url: 'https://example.com/' },
    {
      type: 'organic',
      rank_group: 1,
      rank_absolute: 3,
      domain: 'competitor.com',
      url: 'https://competitor.com/a',
      title: 'Comp',
    },
    {
      type: 'people_also_ask',
      rank_group: 1,
      rank_absolute: 4,
      domain: 'example.com',
      url: 'https://example.com/faq',
    },
    {
      type: 'organic',
      rank_group: 8,
      rank_absolute: 12,
      domain: 'example.com',
      url: 'https://example.com/services/plumbing',
      title: 'Plumbing',
    },
    {
      type: 'organic',
      rank_group: 31,
      rank_absolute: 40,
      domain: 'www.example.com',
      url: 'https://www.example.com/blog/plumbing-guide',
      title: 'Guide',
    },
    {
      type: 'video',
      rank_group: 1,
      rank_absolute: 15,
      domain: 'youtube.com',
      url: 'https://youtube.com/watch?v=1',
    },
  ]

  it('uses organic rank_group (not array index) and picks best URL', () => {
    const matches = selectOrganicDomainMatches(serp, 'example.com')
    expect(matches).toHaveLength(2)
    expect(matches[0]!.organicPosition).toBe(8)
    expect(matches[0]!.url).toContain('/services/plumbing')
    expect(matches[1]!.organicPosition).toBe(31)
  })

  it('detects rankings at edge positions within depth', () => {
    for (const pos of [1, 10, 11, 20, 49, 50, 51, 99, 100]) {
      const items = [
        {
          type: 'organic' as const,
          rank_group: pos,
          rank_absolute: pos + 5,
          domain: 'example.com',
          url: `https://example.com/p/${pos}`,
        },
      ]
      const matches = selectOrganicDomainMatches(items, 'example.com')
      expect(matches[0]!.organicPosition).toBe(pos)
    }
  })

  it('returns empty when domain absent', () => {
    const items = [
      {
        type: 'organic' as const,
        rank_group: 1,
        rank_absolute: 1,
        domain: 'other.com',
        url: 'https://other.com/',
      },
    ]
    expect(selectOrganicDomainMatches(items, 'example.com')).toHaveLength(0)
  })
})
