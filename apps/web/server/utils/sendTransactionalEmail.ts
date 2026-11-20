import type PocketBase from 'pocketbase'
import { loadTransactionalTemplate, applyEmailPlaceholders } from '~/server/utils/transactionalEmailLoad'
import type { TransactionalTemplateId } from '~/server/api/admin/transactional-email-templates.shared'
import { sendHtmlEmail } from '~/server/utils/smtpSend'
import { sendReportViaAgencyProvider } from '~/server/services/email/sendReportViaAgencyProvider'
import { EmailDeliveryError } from '~/server/services/email/types'

export type SendTransactionalEmailOptions = {
  /** When set, prefer Agency → Email Sending (Gmail or platform) for the workspace owner. */
  agencyOwnerId?: string
  fromName?: string
  replyTo?: string
}

function htmlToPlainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function sendTransactionalEmail(
  pb: PocketBase,
  templateId: TransactionalTemplateId,
  to: string,
  vars: Record<string, string>,
  opts?: SendTransactionalEmailOptions,
): Promise<void> {
  const tpl = await loadTransactionalTemplate(pb, templateId)
  const { subject, body } = applyEmailPlaceholders(tpl, vars)
  const text = htmlToPlainText(body)

  const agencyOwnerId = opts?.agencyOwnerId?.trim()
  if (agencyOwnerId) {
    try {
      await sendReportViaAgencyProvider(pb, {
        agencyOwnerId,
        to,
        subject,
        html: body,
        text,
        fromName: opts?.fromName,
        replyTo: opts?.replyTo,
      })
      return
    } catch (e: unknown) {
      const detail =
        e instanceof EmailDeliveryError ? e.userMessage : e instanceof Error ? e.message : String(e)
      console.warn(
        `[transactional-email] agency send failed (${templateId}), falling back to platform mail:`,
        detail.slice(0, 300),
      )
    }
  }

  await sendHtmlEmail({
    to,
    subject,
    html: body,
    text,
    fromName: opts?.fromName,
    replyTo: opts?.replyTo,
  })
}