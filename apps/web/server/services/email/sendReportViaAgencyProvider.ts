import type PocketBase from 'pocketbase'
import { resolveEmailProvider } from '~/server/services/email/resolveEmailProvider'
import type { EmailAttachment, SendEmailResult } from '~/server/services/email/types'
import { EmailDeliveryError } from '~/server/services/email/types'

export interface SendReportViaAgencyInput {
  agencyOwnerId: string
  reportId?: string
  to: string | string[]
  subject: string
  html: string
  text?: string
  fromName?: string
  replyTo?: string
  attachments?: EmailAttachment[]
}

/**
 * Shared send path for manual + scheduled report emails.
 */
export async function sendReportViaAgencyProvider(
  pb: PocketBase,
  input: SendReportViaAgencyInput,
): Promise<SendEmailResult> {
  const resolved = await resolveEmailProvider(pb, input.agencyOwnerId)
  if (!resolved.ok) {
    logAgencyEmailDelivery({
      agencyId: input.agencyOwnerId,
      reportId: input.reportId,
      provider: 'none',
      senderEmail: null,
      recipientCount: Array.isArray(input.to) ? input.to.length : 1,
      status: 'failed',
      errorCategory: resolved.error.category,
      timestamp: new Date().toISOString(),
    })
    throw resolved.error
  }

  const provider = resolved.provider
  try {
    const result = await provider.sendReportEmail({
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      fromName: input.fromName,
      replyTo: input.replyTo,
      attachments: input.attachments,
    })
    logAgencyEmailDelivery({
      agencyId: input.agencyOwnerId,
      reportId: input.reportId,
      provider: result.provider,
      senderEmail: result.senderEmail,
      recipientCount: result.recipientCount,
      status: 'delivered',
      providerMessageId: result.messageId,
      timestamp: new Date().toISOString(),
    })
    return result
  } catch (e) {
    const err =
      e instanceof EmailDeliveryError
        ? e
        : new EmailDeliveryError({
            category: 'send_failed',
            userMessage: 'Could not send the report email.',
            technicalDetail: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200),
          })
    logAgencyEmailDelivery({
      agencyId: input.agencyOwnerId,
      reportId: input.reportId,
      provider: provider.id,
      senderEmail: provider.senderEmail,
      recipientCount: Array.isArray(input.to) ? input.to.length : 1,
      status: 'failed',
      errorCategory: err.category,
      timestamp: new Date().toISOString(),
    })
    throw err
  }
}

export function logAgencyEmailDelivery(entry: {
  agencyId: string
  reportId?: string
  provider: string
  senderEmail: string | null
  recipientCount: number
  status: 'delivered' | 'failed'
  providerMessageId?: string
  errorCategory?: string
  timestamp: string
}): void {
  console.info(
    '[agency-email-delivery]',
    JSON.stringify({
      agencyId: entry.agencyId,
      reportId: entry.reportId || null,
      provider: entry.provider,
      senderEmail: entry.senderEmail,
      recipientCount: entry.recipientCount,
      status: entry.status,
      providerMessageId: entry.providerMessageId || null,
      errorCategory: entry.errorCategory || null,
      timestamp: entry.timestamp,
    }),
  )
}
