import type { CrmClient } from '~/types'
import { sendHtmlEmail } from '~/server/utils/smtpSend'

/** Thin wrapper around transactional SMTP (PocketBase / env mailer). */
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
