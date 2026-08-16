import { describe, expect, it } from 'vitest'
import { facebookUrlAssetId, normalizeFacebookPageUrl } from '~/server/services/social/facebookUrl'

describe('normalizeFacebookPageUrl', () => {
  it('accepts facebook.com/foo without scheme', () => {
    const n = normalizeFacebookPageUrl('facebook.com/foo')
    expect(n?.canonicalUrl).toBe('https://www.facebook.com/foo')
    expect(n?.username).toBe('foo')
  })

  it('accepts www and trailing slash', () => {
    const n = normalizeFacebookPageUrl('www.facebook.com/foo/')
    expect(n?.canonicalUrl).toBe('https://www.facebook.com/foo')
  })

  it('accepts https://facebook.com/foo', () => {
    const n = normalizeFacebookPageUrl('https://facebook.com/foo')
    expect(n?.canonicalUrl).toBe('https://www.facebook.com/foo')
  })

  it('strips query strings on username URLs', () => {
    const n = normalizeFacebookPageUrl('https://www.facebook.com/foo?locale=en_US')
    expect(n?.canonicalUrl).toBe('https://www.facebook.com/foo')
  })

  it('parses profile.php?id=', () => {
    const n = normalizeFacebookPageUrl('https://www.facebook.com/profile.php?id=123456')
    expect(n?.numericId).toBe('123456')
    expect(n?.canonicalUrl).toBe('https://www.facebook.com/profile.php?id=123456')
  })

  it('rejects reserved paths', () => {
    expect(normalizeFacebookPageUrl('https://www.facebook.com/login')).toBeNull()
    expect(normalizeFacebookPageUrl('https://www.facebook.com/watch')).toBeNull()
  })

  it('rejects non-facebook hosts', () => {
    expect(normalizeFacebookPageUrl('https://example.com/foo')).toBeNull()
  })

  it('builds public asset ids', () => {
    expect(facebookUrlAssetId(normalizeFacebookPageUrl('facebook.com/Foo')!)).toBe('fb_url:foo')
    expect(facebookUrlAssetId(normalizeFacebookPageUrl('https://www.facebook.com/profile.php?id=99')!)).toBe('fb_id:99')
  })
})
