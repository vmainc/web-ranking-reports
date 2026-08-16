import { describe, expect, it } from 'vitest'
import { UnavailableFacebookPublicPageProvider } from '~/server/services/social/providers/facebookPublic'
import { SocialErrorCode, isSocialServiceError } from '~/server/services/social/errors'
import { parseMetricNumber, normalizedMetric, metricAvailable } from '~/server/services/social/metrics/normalize'

describe('UnavailableFacebookPublicPageProvider', () => {
  const provider = new UnavailableFacebookPublicPageProvider()

  it('resolves a valid Page URL without inventing a Meta Page id', async () => {
    const page = await provider.resolvePage('https://www.facebook.com/rodomaticplumbing')
    expect(page.canonicalUrl).toBe('https://www.facebook.com/rodomaticplumbing')
    expect(page.externalId).toBe('fb_url:rodomaticplumbing')
    expect(page.displayName).toBeTruthy()
  })

  it('throws PUBLIC_PAGE_NOT_FOUND for invalid URLs', async () => {
    try {
      await provider.resolvePage('https://example.com/not-facebook')
      expect.fail('expected throw')
    } catch (e) {
      expect(isSocialServiceError(e)).toBe(true)
      if (isSocialServiceError(e)) expect(e.code).toBe(SocialErrorCode.PUBLIC_PAGE_NOT_FOUND)
    }
  })

  it('returns no metrics (provider unavailable — does not invent data)', async () => {
    const page = await provider.resolvePage('facebook.com/foo')
    const metrics = await provider.fetchMetrics(page)
    expect(metrics.followers).toBeUndefined()
    expect(metricAvailable(metrics.followers)).toBe(false)
  })
})

describe('metric normalization', () => {
  it('keeps exact integers exact', () => {
    const m = normalizedMetric({
      key: 'facebook.page.followers',
      raw: 2214387,
      source: 'meta_graph',
      collectedAt: '2026-08-15T00:00:00.000Z',
    })
    expect(m.value).toBe(2214387)
    expect(m.isExact).toBe(true)
    expect(metricAvailable(m)).toBe(true)
  })

  it('treats zero as available', () => {
    const parsed = parseMetricNumber(0)
    expect(parsed.value).toBe(0)
    expect(metricAvailable(normalizedMetric({ key: 'x', raw: 0, source: 't', collectedAt: 't' }))).toBe(true)
  })

  it('treats missing as unavailable, not zero', () => {
    const parsed = parseMetricNumber(null)
    expect(parsed.value).toBeNull()
    expect(metricAvailable(normalizedMetric({ key: 'x', raw: null, source: 't', collectedAt: 't' }))).toBe(false)
  })

  it('parses abbreviated approximate values', () => {
    const parsed = parseMetricNumber('2.2M')
    expect(parsed.value).toBe(2_200_000)
    expect(parsed.isExact).toBe(false)
    const m = normalizedMetric({
      key: 'facebook.page.followers',
      raw: '2.2M',
      source: 'serpapi',
      collectedAt: '2026-08-15T00:00:00.000Z',
    })
    expect(m.isExact).toBe(false)
    expect(m.source).toBe('serpapi')
  })
})
