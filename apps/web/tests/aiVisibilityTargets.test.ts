import { describe, expect, it } from 'vitest'
import {
  brandKeywordTargetEntities,
  domainTargetEntities,
} from '~/server/utils/dataforseoAiVisibility'

describe('ai visibility DataForSEO targets', () => {
  it('builds a domain-only target for brand mentions', () => {
    expect(domainTargetEntities('rodomatic.com')).toEqual([
      { domain: 'rodomatic.com', search_filter: 'include', include_subdomains: true },
    ])
  })

  it('scopes keyword queries to the brand domain (not market-wide keyword volume)', () => {
    const target = brandKeywordTargetEntities('rodomatic.com', 'plumber in kansas city')
    expect(target).toEqual([
      { domain: 'rodomatic.com', search_filter: 'include', include_subdomains: true },
      {
        keyword: 'plumber in kansas city',
        search_filter: 'include',
        search_scope: ['any'],
        match_type: 'word_match',
      },
    ])
    expect(target.some((t) => 'keyword' in t && !('domain' in t) && target.length === 1)).toBe(false)
  })
})
