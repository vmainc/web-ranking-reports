import { describe, expect, it, beforeEach } from 'vitest'
import { assertRateLimit, _resetEmailSendingRateLimits } from '~/server/utils/emailSendingRateLimit'

describe('emailSendingRateLimit', () => {
  beforeEach(() => {
    _resetEmailSendingRateLimits()
  })

  it('allows requests under the limit', () => {
    expect(() => assertRateLimit({ key: 't1', limit: 3, windowMs: 60_000 })).not.toThrow()
    expect(() => assertRateLimit({ key: 't1', limit: 3, windowMs: 60_000 })).not.toThrow()
    expect(() => assertRateLimit({ key: 't1', limit: 3, windowMs: 60_000 })).not.toThrow()
  })

  it('blocks over the limit', () => {
    assertRateLimit({ key: 't2', limit: 1, windowMs: 60_000 })
    expect(() => assertRateLimit({ key: 't2', limit: 1, windowMs: 60_000 })).toThrow()
  })
})
