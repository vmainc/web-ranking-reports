import { describe, expect, it } from 'vitest'
import {
  getEmailSendingOauthRedirectUri,
  toSanitizedEmailSettings,
} from '~/server/services/email/agencyEmailIntegration'
import type { AgencyEmailIntegrationRecord } from '~/server/services/email/types'
import { _gmailMimeTestUtils } from '~/server/services/email/googleGmailProvider'

describe('toSanitizedEmailSettings', () => {
  it('never exposes token fields', () => {
    const row: AgencyEmailIntegrationRecord = {
      id: '1',
      agency: 'owner1',
      delivery_method: 'google',
      connection_status: 'connected',
      sender_email: 'agency@gmail.com',
      sender_name: 'Agency',
      encrypted_access_token: 'v1:secret',
      encrypted_refresh_token: 'v1:secret2',
    }
    const dto = toSanitizedEmailSettings(row, { googleConfigured: true, encryptionConfigured: true })
    expect(dto.senderEmail).toBe('agency@gmail.com')
    expect(JSON.stringify(dto)).not.toContain('encrypted')
    expect(JSON.stringify(dto)).not.toContain('v1:secret')
    expect(dto.oauthRedirectUri).toContain('/api/agency/email-sending/google/callback')
  })

  it('defaults to system when no row', () => {
    const dto = toSanitizedEmailSettings(null, { googleConfigured: false, encryptionConfigured: false })
    expect(dto.deliveryMethod).toBe('system')
    expect(dto.connectionStatus).toBe('disconnected')
  })
})

describe('emailSendingRedirectUri', () => {
  it('never uses the Analytics Google callback path', () => {
    const prev = process.env.GOOGLE_OAUTH_REDIRECT_URI
    process.env.GOOGLE_OAUTH_REDIRECT_URI = 'https://webrankingreports.com/api/google/callback'
    try {
      expect(getEmailSendingOauthRedirectUri()).toBe(
        'https://webrankingreports.com/api/agency/email-sending/google/callback',
      )
    } finally {
      if (prev === undefined) delete process.env.GOOGLE_OAUTH_REDIRECT_URI
      else process.env.GOOGLE_OAUTH_REDIRECT_URI = prev
    }
  })
})

describe('gmail mime helpers', () => {
  it('builds url-safe base64 without padding plus/slash issues', () => {
    const raw = _gmailMimeTestUtils.toUrlSafeBase64('hello+/=world')
    expect(raw).not.toContain('+')
    expect(raw).not.toContain('/')
    expect(raw).not.toMatch(/=+$/)
  })

  it('maps revoked token errors', () => {
    const err = _gmailMimeTestUtils.mapGmailApiError(401, 'invalid_grant Token has been expired or revoked')
    expect(err.category).toBe('connection_revoked')
  })

  it('maps rate limit errors', () => {
    const err = _gmailMimeTestUtils.mapGmailApiError(429, 'rateLimitExceeded')
    expect(err.category).toBe('rate_limited')
  })
})
