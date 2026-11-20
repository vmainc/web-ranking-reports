import type PocketBase from 'pocketbase'
import type { CrmClient } from '~/types'
import { sendHtmlEmail } from '~/server/utils/smtpSend'
import { getAgencyEmailIntegration } from '~/server/services/email/agencyEmailIntegration'
import { sendReportViaAgencyProvider } from '~/server/services/email/sendReportViaAgencyProvider'
import { EmailDeliveryError } from '~/server/services/email/types'

function htmlToPlainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Send a marketing HTML message using Agency → Email Sending when configured, else platform SMTP.
 */
export async function sendCampaignHtmlEmail(
  pb: PocketBase,
  agencyOwnerId: string,
  opts: { to: string; subject: string; html: string; fromName?: string; replyTo?: string },
): Promise<{ provider: string; senderEmail: string }> {
  let fromName = opts.fromName?.trim()
  let replyTo = opts.replyTo?.trim()
  if (!fromName || !replyTo) {
    try {
      const integ = await getAgencyEmailIntegration(pb, agencyOwnerId)
      if (!fromName && integ?.sender_name?.trim()) fromName = integ.sender_name.trim()
      if (!replyTo && integ?.reply_to_email?.trim()) replyTo = integ.reply_to_email.trim()
    } catch {
      // ignore
    }
  }

  const text = htmlToPlainText(opts.html)
  try {
    const result = await sendReportViaAgencyProvider(pb, {
      agencyOwnerId,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text,
      fromName,
      replyTo,
    })
    return { provider: result.provider, senderEmail: result.senderEmail }
  } catch (e) {
    if (e instanceof EmailDeliveryError) {
      console.warn('[campaign-email] agency send failed, falling back to platform mail:', e.userMessage)
    }
    await sendHtmlEmail({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text,
      fromName,
      replyTo,
    })
    return { provider: 'system', senderEmail: '' }
  }
}

/** @deprecated Prefer sendCampaignHtmlEmail for agency-aware delivery. */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  await sendHtmlEmail({ to, subject, html })
}

/**
 * Replace {{first_name}} and {{email}} in HTML. First name is the first word of the contact name.
 */
export function personalizeCampaignHtml(html: string, contact: Pick<CrmClient, 'name' | 'email'>): string {
  const email = (contact.email ?? '').trim()
  const full = (contact.name ?? '').trim()
  const firstName = full.split(/\s+/).filter(Boolean)[0] ?? ''
  return html.replace(/\{\{\s*email\s*\}\}/gi, email).replace(/\{\{\s*first_name\s*\}\}/gi, firstName)
}
