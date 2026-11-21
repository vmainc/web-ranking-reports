import { describe, expect, it } from 'vitest'
import { crmWebsiteLabel, normalizeCrmWebsite } from './crmWebsite'

describe('normalizeCrmWebsite', () => {
  it('adds https to bare domains', () => {
    expect(normalizeCrmWebsite('funflicks.com')).toBe('https://funflicks.com')
  })
  it('preserves existing scheme', () => {
    expect(normalizeCrmWebsite('https://x.com/path')).toBe('https://x.com/path')
  })
})