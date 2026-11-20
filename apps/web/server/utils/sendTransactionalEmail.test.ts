import { describe, it, expect, vi, beforeEach } from 'vitest'
import type PocketBase from 'pocketbase'

const sendReportViaAgencyProvider = vi.fn()
const sendHtmlEmail = vi.fn()
const loadTransactionalTemplate = vi.fn()

vi.mock('~/server/services/email/sendReportViaAgencyProvider', () => ({
  sendReportViaAgencyProvider: (...args: unknown[]) => sendReportViaAgencyProvider(...args),
}))

vi.mock('~/server/utils/smtpSend', () => ({
  sendHtmlEmail: (...args: unknown[]) => sendHtmlEmail(...args),
}))

vi.mock('~/server/utils/transactionalEmailLoad', async () => {
  const actual = await vi.importActual<typeof import('~/server/utils/transactionalEmailLoad')>(
    '~/server/utils/transactionalEmailLoad',
  )
  return {
    ...actual,
    loadTransactionalTemplate: (...args: unknown[]) => loadTransactionalTemplate(...args),
  }
})

import { sendTransactionalEmail } from '~/server/utils/sendTransactionalEmail'
import { EmailDeliveryError } from '~/server/services/email/types'

describe('sendTransactionalEmail', () => {
  const pb = {} as PocketBase

  beforeEach(() => {
    vi.clearAllMocks()
    loadTransactionalTemplate.mockResolvedValue({
      subject: 'Hello {NAME}',
      body: '<p>Hi {NAME}</p>',
    })
    sendReportViaAgencyProvider.mockResolvedValue({ provider: 'google', senderEmail: 'admin@vma.agency', recipientCount: 1 })
    sendHtmlEmail.mockResolvedValue(undefined)
  })

  it('uses agency provider when agencyOwnerId is set', async () => {
    await sendTransactionalEmail(pb, 'website_audit_report', 'lead@example.com', { NAME: 'Pat' }, {
      agencyOwnerId: 'owner1',
      fromName: 'Virtual Market Advantage',
      replyTo: 'admin@vma.agency',
    })

    expect(sendReportViaAgencyProvider).toHaveBeenCalledWith(
      pb,
      expect.objectContaining({
        agencyOwnerId: 'owner1',
        to: 'lead@example.com',
        subject: 'Hello Pat',
        html: '<p>Hi Pat</p>',
        fromName: 'Virtual Market Advantage',
        replyTo: 'admin@vma.agency',
      }),
    )
    expect(sendHtmlEmail).not.toHaveBeenCalled()
  })

  it('falls back to platform mail when agency send fails', async () => {
    sendReportViaAgencyProvider.mockRejectedValue(
      new EmailDeliveryError({ category: 'connection_revoked', userMessage: 'Reconnect Google', statusCode: 401 }),
    )

    await sendTransactionalEmail(pb, 'website_audit_report', 'lead@example.com', { NAME: 'Pat' }, {
      agencyOwnerId: 'owner1',
      fromName: 'VMA',
    })

    expect(sendHtmlEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'lead@example.com',
        subject: 'Hello Pat',
        fromName: 'VMA',
      }),
    )
  })

  it('uses platform mail when no agencyOwnerId', async () => {
    await sendTransactionalEmail(pb, 'client_invite', 'x@y.com', { NAME: 'Z' })

    expect(sendReportViaAgencyProvider).not.toHaveBeenCalled()
    expect(sendHtmlEmail).toHaveBeenCalled()
  })
})