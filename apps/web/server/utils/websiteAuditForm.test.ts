import { describe, expect, it } from 'vitest'
import {
  defaultWebsiteAuditFormSettings,
  normalizeRedirectUrl,
  normalizeWebsiteUrl,
  newPublicKey,
  newReportToken,
} from './websiteAuditForm'

describe('normalizeRedirectUrl', () => {
  it('accepts https URLs', () => {
    expect(normalizeRedirectUrl('https://example.com/thank-you')).toBe('https://example.com/thank-you')
  })

  it('rejects non-http schemes', () => {
    expect(normalizeRedirectUrl('javascript:alert(1)')).toBe('')
  })

  it('allows empty', () => {
    expect(normalizeRedirectUrl('')).toBe('')
  })
})

describe('normalizeWebsiteUrl', () => {
  it('adds https when missing', () => {
    expect(normalizeWebsiteUrl('example.com')).toBe('https://example.com/')
  })

  it('keeps existing protocol', () => {
    expect(normalizeWebsiteUrl('http://example.com/path')).toBe('http://example.com/path')
  })

  it('rejects empty or invalid', () => {
    expect(normalizeWebsiteUrl('')).toBe('')
    expect(normalizeWebsiteUrl('not-a-domain')).toBe('')
  })
})

describe('website audit keys', () => {
  it('generates distinct public and report tokens', () => {
    const a = newPublicKey()
    const b = newReportToken()
    expect(a.startsWith('waf_')).toBe(true)
    expect(b.startsWith('war_')).toBe(true)
    expect(a).not.toBe(b)
  })

  it('defaults include required copy', () => {
    const s = defaultWebsiteAuditFormSettings('waf_test')
    expect(s.enabled).toBe(true)
    expect(s.publicKey).toBe('waf_test')
    expect(s.headline.length).toBeGreaterThan(0)
    expect(s.buttonLabel.length).toBeGreaterThan(0)
  })
})
