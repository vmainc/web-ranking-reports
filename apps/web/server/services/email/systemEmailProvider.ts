import { sendHtmlEmail } from '~/server/utils/smtpSend'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import type { EmailProvider, SendEmailInput, SendEmailResult } from '~/server/services/email/types'
import { EmailDeliveryError } from '~/server/services/email/types'

function normalizeRecipients(to: string | string[]): string[] {
  const list = Array.isArray(to) ? to : [to]
  return list.map((e) => e.trim().toLowerCase()).filter(Boolean)
}

export class SystemEmailProvider implements EmailProvider {
  readonly id = 'system' as const
  readonly senderEmail: string

  constructor(senderEmail: string) {
    this.senderEmail = senderEmail
  }

  static async create(): Promise<SystemEmailProvider> {
    const pb = getAdminPb()
    await adminAuth(pb)
    const s = (await pb.settings.getAll()) as { meta?: { senderAddress?: string } }
    const addr = (s.meta?.senderAddress || '').trim()
    if (!addr) {
      throw new EmailDeliveryError({
        category: 'configuration_missing',
        userMessage: 'Web Ranking Reports email is not configured (missing sender address).',
        statusCode: 503,
      })
    }
    return new SystemEmailProvider(addr)
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const recipients = normalizeRecipients(input.to)
    if (!recipients.length) {
      throw new EmailDeliveryError({
        category: 'sender_incomplete',
        userMessage: 'At least one recipient email is required.',
        statusCode: 400,
      })
    }
    try {
      await sendHtmlEmail({
        to: recipients.join(', '),
        subject: input.subject,
        html: input.html,
        text: input.text,
        fromName: input.fromName,
        replyTo: input.replyTo,
        attachments: input.attachments,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new EmailDeliveryError({
        category: 'send_failed',
        userMessage: 'Could not send email via Web Ranking Reports mail.',
        technicalDetail: msg.slice(0, 300),
        statusCode: 502,
      })
    }
    return {
      provider: 'system',
      senderEmail: this.senderEmail,
      recipientCount: recipients.length,
    }
  }

  sendReportEmail(input: SendEmailInput): Promise<SendEmailResult> {
    return this.sendEmail(input)
  }

  async testConnection(to: string): Promise<SendEmailResult> {
    return this.sendEmail({
      to,
      subject: 'Web Ranking Reports Email Test',
      html: '<p>This test confirms that Web Ranking Reports can send reports using the platform email sender.</p>',
      text: 'This test confirms that Web Ranking Reports can send reports using the platform email sender.',
    })
  }
}
