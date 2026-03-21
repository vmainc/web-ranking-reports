import nodemailer from 'nodemailer'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'

type PbSmtp = {
  enabled?: boolean
  host?: string
  port?: number
  username?: string
  password?: string
  tls?: boolean
}

/**
 * Send HTML email using PocketBase mailer settings (admin API).
 * Requires SMTP enabled and PB admin credentials on the server.
 */
export async function sendHtmlEmail(opts: { to: string; subject: string; html: string; text?: string }): Promise<void> {
  const pb = getAdminPb()
  await adminAuth(pb)
  const s = (await pb.settings.getAll()) as { smtp?: PbSmtp; meta?: { senderName?: string; senderAddress?: string } }
  const smtp = s.smtp
  if (!smtp?.enabled || !smtp.host || !smtp.port) {
    throw createError({ statusCode: 503, message: 'SMTP is not enabled or incomplete in PocketBase Settings → Mailer.' })
  }
  const fromName = s.meta?.senderName || 'Web Ranking Reports'
  const fromAddr = s.meta?.senderAddress || ''
  if (!fromAddr) {
    throw createError({ statusCode: 503, message: 'Set sender address in PocketBase Settings → Application.' })
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: smtp.username
      ? {
          user: smtp.username,
          pass: smtp.password ?? '',
        }
      : undefined,
  })

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddr}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text ?? opts.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    html: opts.html,
  })
}
