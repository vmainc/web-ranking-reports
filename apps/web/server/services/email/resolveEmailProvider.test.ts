import { describe, expect, it, vi, beforeEach } from 'vitest'
import { EmailDeliveryError } from '~/server/services/email/types'

vi.mock('~/server/services/email/agencyEmailIntegration', async () => {
  const actual = await vi.importActual<typeof import('~/server/services/email/agencyEmailIntegration')>(
    '~/server/services/email/agencyEmailIntegration',
  )
  return {
    ...actual,
    getAgencyEmailIntegration: vi.fn(),
    getGoogleEmailOauthConfig: vi.fn(() => ({
      client_id: 'id',
      client_secret: 'secret',
      redirect_uri: 'http://localhost/cb',
    })),
    isEmailEncryptionConfigured: vi.fn(() => true),
  }
})

vi.mock('~/server/services/email/systemEmailProvider', () => ({
  SystemEmailProvider: {
    create: vi.fn(async () => ({
      id: 'system',
      senderEmail: 'info@example.com',
      sendEmail: vi.fn(),
      sendReportEmail: vi.fn(),
      testConnection: vi.fn(),
    })),
  },
}))

vi.mock('~/server/utils/emailCredentialsCrypto', () => ({
  decryptEmailCredential: vi.fn(() => 'access-token'),
  encryptEmailCredential: vi.fn((s: string) => `enc:${s}`),
}))

import { resolveEmailProvider } from '~/server/services/email/resolveEmailProvider'
import { getAgencyEmailIntegration } from '~/server/services/email/agencyEmailIntegration'

describe('resolveEmailProvider', () => {
  const pb = {} as never

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses system provider when delivery_method is system', async () => {
    vi.mocked(getAgencyEmailIntegration).mockResolvedValue({
      id: '1',
      agency: 'a1',
      delivery_method: 'system',
      connection_status: 'disconnected',
    })
    const result = await resolveEmailProvider(pb, 'a1')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.provider.id).toBe('system')
  })

  it('fails clearly when google selected but disconnected', async () => {
    vi.mocked(getAgencyEmailIntegration).mockResolvedValue({
      id: '1',
      agency: 'a1',
      delivery_method: 'google',
      connection_status: 'disconnected',
    })
    const result = await resolveEmailProvider(pb, 'a1')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(EmailDeliveryError)
      expect(result.error.category).toBe('sender_incomplete')
    }
  })

  it('fails when google selected and reconnect_required', async () => {
    vi.mocked(getAgencyEmailIntegration).mockResolvedValue({
      id: '1',
      agency: 'a1',
      delivery_method: 'google',
      connection_status: 'reconnect_required',
      sender_email: 'x@gmail.com',
      encrypted_access_token: 'v1:x',
      encrypted_refresh_token: 'v1:y',
    })
    const result = await resolveEmailProvider(pb, 'a1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.category).toBe('connection_revoked')
  })

  it('fails when refresh token missing', async () => {
    vi.mocked(getAgencyEmailIntegration).mockResolvedValue({
      id: '1',
      agency: 'a1',
      delivery_method: 'google',
      connection_status: 'connected',
      sender_email: 'x@gmail.com',
      encrypted_access_token: 'v1:x',
      encrypted_refresh_token: '',
    })
    const result = await resolveEmailProvider(pb, 'a1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.category).toBe('missing_refresh_token')
  })
})
