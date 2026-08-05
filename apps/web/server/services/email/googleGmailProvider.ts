import type PocketBase from 'pocketbase'
import { encryptEmailCredential, decryptEmailCredential } from '~/server/utils/emailCredentialsCrypto'
import { refreshAccessToken } from '~/server/utils/googleOauth'
import {
  getGoogleEmailOauthConfig,
  upsertAgencyEmailIntegration,
} from '~/server/services/email/agencyEmailIntegration'
import type {
  AgencyEmailIntegrationRecord,
  EmailAttachment,
  EmailProvider,
  SendEmailInput,
  SendEmailResult,
} from '~/server/services/email/types'
import { EmailDeliveryError } from '~/server/services/email/types'

/** Per-agency refresh locks to avoid concurrent token refresh races. */
const refreshLocks = new Map<string, Promise<string>>()

const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
/** Gmail typically rejects messages larger than ~25MB encoded. */
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024

function normalizeRecipients(to: string | string[] | undefined): string[] {
  if (!to) return []
  const list = Array.isArray(to) ? to : [to]
  return list.map((e) => e.trim()).filter(Boolean)
}

function encodeSubject(subject: string): string {
  // RFC 2047 encoded-word for non-ASCII subjects
  if (/^[\x20-\x7E]*$/.test(subject)) return subject
  return `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`
}

function buildMimeMessage(opts: {
  fromEmail: string
  fromName?: string
  to: string[]
  cc: string[]
  bcc: string[]
  replyTo?: string
  subject: string
  html: string
  text: string
  attachments?: EmailAttachment[]
}): string {
  const boundary = `wrr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  const fromHeader = opts.fromName?.trim()
    ? `"${opts.fromName.replace(/"/g, '\\"')}" <${opts.fromEmail}>`
    : opts.fromEmail

  const headers: string[] = [
    `From: ${fromHeader}`,
    `To: ${opts.to.join(', ')}`,
    `Subject: ${encodeSubject(opts.subject)}`,
    'MIME-Version: 1.0',
  ]
  if (opts.cc.length) headers.push(`Cc: ${opts.cc.join(', ')}`)
  if (opts.bcc.length) headers.push(`Bcc: ${opts.bcc.join(', ')}`)
  if (opts.replyTo?.trim()) headers.push(`Reply-To: ${opts.replyTo.trim()}`)

  const hasAttachments = Boolean(opts.attachments?.length)
  if (!hasAttachments) {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)
    const body = [
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      opts.text,
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      opts.html,
      `--${boundary}--`,
    ].join('\r\n')
    return `${headers.join('\r\n')}\r\n\r\n${body}`
  }

  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)
  const altBoundary = `${boundary}_alt`
  const parts: string[] = [
    `--${boundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    '',
    `--${altBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    opts.text,
    `--${altBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    opts.html,
    `--${altBoundary}--`,
  ]

  for (const att of opts.attachments || []) {
    const total = att.content.length
    if (total > MAX_ATTACHMENT_BYTES) {
      throw new EmailDeliveryError({
        category: 'attachment_too_large',
        userMessage: 'The report PDF is too large to send via Gmail. Try a smaller report or contact support.',
        statusCode: 413,
      })
    }
    const ctype = att.contentType || 'application/octet-stream'
    const b64 = att.content.toString('base64').replace(/(.{76})/g, '$1\r\n')
    parts.push(
      `--${boundary}`,
      `Content-Type: ${ctype}; name="${att.filename.replace(/"/g, '')}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${att.filename.replace(/"/g, '')}"`,
      '',
      b64,
    )
  }
  parts.push(`--${boundary}--`)
  return `${headers.join('\r\n')}\r\n\r\n${parts.join('\r\n')}`
}

function toUrlSafeBase64(raw: string): string {
  return Buffer.from(raw, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function mapGmailApiError(status: number, body: string): EmailDeliveryError {
  if (status === 401 || /invalid_grant|Token has been expired or revoked/i.test(body)) {
    return new EmailDeliveryError({
      category: 'connection_revoked',
      userMessage: 'Google connection was revoked or expired. Reconnect Google in Agency → Email Sending.',
      technicalDetail: body.slice(0, 200),
      statusCode: 401,
    })
  }
  if (status === 403 || /insufficient|ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficientPermissions/i.test(body)) {
    return new EmailDeliveryError({
      category: 'insufficient_permissions',
      userMessage: 'The connected Google account is missing Gmail send permission. Reconnect and grant access.',
      technicalDetail: body.slice(0, 200),
      statusCode: 403,
    })
  }
  if (status === 429 || /rateLimitExceeded|userRateLimitExceeded/i.test(body)) {
    return new EmailDeliveryError({
      category: 'rate_limited',
      userMessage: 'Gmail rate limit reached. Try again in a few minutes.',
      technicalDetail: body.slice(0, 200),
      statusCode: 429,
    })
  }
  if (status >= 500) {
    return new EmailDeliveryError({
      category: 'provider_unavailable',
      userMessage: 'Gmail is temporarily unavailable. Try again shortly.',
      technicalDetail: body.slice(0, 200),
      statusCode: 503,
    })
  }
  return new EmailDeliveryError({
    category: 'send_failed',
    userMessage: 'Could not send email through the connected Google account.',
    technicalDetail: body.slice(0, 200),
    statusCode: 502,
  })
}

export class GoogleGmailProvider implements EmailProvider {
  readonly id = 'google' as const
  readonly senderEmail: string

  private pb: PocketBase
  private agencyOwnerId: string
  private integrationId: string
  private fromName: string
  private replyTo: string
  private accessToken: string
  private refreshTokenEncrypted: string
  private tokenExpiryIso: string | null

  constructor(opts: {
    pb: PocketBase
    agencyOwnerId: string
    row: AgencyEmailIntegrationRecord
    accessToken: string
  }) {
    this.pb = opts.pb
    this.agencyOwnerId = opts.agencyOwnerId
    this.integrationId = opts.row.id
    this.senderEmail = (opts.row.sender_email || '').trim()
    this.fromName = (opts.row.sender_name || '').trim()
    this.replyTo = (opts.row.reply_to_email || '').trim()
    this.accessToken = opts.accessToken
    this.refreshTokenEncrypted = (opts.row.encrypted_refresh_token || '').trim()
    this.tokenExpiryIso = opts.row.token_expiry || null
  }

  private tokenNeedsRefresh(): boolean {
    if (!this.tokenExpiryIso) return true
    const exp = Date.parse(this.tokenExpiryIso)
    if (Number.isNaN(exp)) return true
    return Date.now() > exp - 60_000
  }

  private async getValidAccessToken(): Promise<string> {
    if (!this.tokenNeedsRefresh()) return this.accessToken

    const existing = refreshLocks.get(this.agencyOwnerId)
    if (existing) return existing

    const work = (async () => {
      const oauth = getGoogleEmailOauthConfig()
      if (!oauth) {
        throw new EmailDeliveryError({
          category: 'configuration_missing',
          userMessage: 'Google email sending is not configured on this server.',
          statusCode: 503,
        })
      }
      if (!this.refreshTokenEncrypted) {
        await this.markReconnectRequired('missing_refresh_token')
        throw new EmailDeliveryError({
          category: 'missing_refresh_token',
          userMessage: 'Google connection is incomplete (missing refresh token). Reconnect Google Account.',
          statusCode: 401,
        })
      }
      let refreshPlain: string
      try {
        refreshPlain = decryptEmailCredential(this.refreshTokenEncrypted)
      } catch {
        await this.markReconnectRequired('decrypt_failed')
        throw new EmailDeliveryError({
          category: 'token_refresh_failed',
          userMessage: 'Could not unlock stored Google credentials. Reconnect Google Account.',
          statusCode: 500,
        })
      }
      try {
        const refreshed = await refreshAccessToken(oauth, refreshPlain)
        this.accessToken = refreshed.access_token
        const expiresIn = typeof refreshed.expires_in === 'number' ? refreshed.expires_in : 3600
        this.tokenExpiryIso = new Date(Date.now() + expiresIn * 1000).toISOString()
        const nowIso = new Date().toISOString()
        await this.pb.collection('agency_email_integrations').update(this.integrationId, {
          encrypted_access_token: encryptEmailCredential(refreshed.access_token),
          token_expiry: this.tokenExpiryIso,
          last_token_refresh_at: nowIso,
          connection_status: 'connected',
          last_send_error: '',
        })
        return this.accessToken
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e)
        await this.markReconnectRequired(detail.slice(0, 200))
        throw new EmailDeliveryError({
          category: 'token_refresh_failed',
          userMessage: 'Google token refresh failed. Reconnect Google Account in Agency → Email Sending.',
          technicalDetail: detail.slice(0, 200),
          statusCode: 401,
        })
      }
    })()

    refreshLocks.set(this.agencyOwnerId, work)
    try {
      return await work
    } finally {
      refreshLocks.delete(this.agencyOwnerId)
    }
  }

  private async markReconnectRequired(technical: string): Promise<void> {
    try {
      await upsertAgencyEmailIntegration(this.pb, this.agencyOwnerId, {
        connection_status: 'reconnect_required',
        last_send_error: technical.slice(0, 500),
      })
    } catch {
      // ignore
    }
  }

  private async sendRaw(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.senderEmail) {
      throw new EmailDeliveryError({
        category: 'sender_incomplete',
        userMessage: 'Connected Google sender email is missing. Reconnect Google Account.',
        statusCode: 400,
      })
    }
    const to = normalizeRecipients(input.to)
    if (!to.length) {
      throw new EmailDeliveryError({
        category: 'sender_incomplete',
        userMessage: 'At least one recipient email is required.',
        statusCode: 400,
      })
    }
    const token = await this.getValidAccessToken()
    const text =
      input.text ??
      input.html
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    const mime = buildMimeMessage({
      fromEmail: this.senderEmail,
      fromName: input.fromName?.trim() || this.fromName || undefined,
      to,
      cc: normalizeRecipients(input.cc),
      bcc: normalizeRecipients(input.bcc),
      replyTo: input.replyTo?.trim() || this.replyTo || undefined,
      subject: input.subject,
      html: input.html,
      text,
      attachments: input.attachments,
    })
    const raw = toUrlSafeBase64(mime)
    const res = await fetch(GMAIL_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    })
    const bodyText = await res.text()
    if (!res.ok) {
      const err = mapGmailApiError(res.status, bodyText)
      if (err.category === 'connection_revoked' || err.category === 'insufficient_permissions') {
        await this.markReconnectRequired(err.technicalDetail || err.category)
      }
      throw err
    }
    let messageId: string | undefined
    try {
      const json = JSON.parse(bodyText) as { id?: string }
      messageId = typeof json.id === 'string' ? json.id : undefined
    } catch {
      // ignore
    }
    const nowIso = new Date().toISOString()
    try {
      await this.pb.collection('agency_email_integrations').update(this.integrationId, {
        last_successful_send_at: nowIso,
        last_send_error: '',
        connection_status: 'connected',
      })
    } catch {
      // ignore
    }
    return {
      provider: 'google',
      senderEmail: this.senderEmail,
      messageId,
      recipientCount: to.length,
    }
  }

  sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    return this.sendRaw(input)
  }

  sendReportEmail(input: SendEmailInput): Promise<SendEmailResult> {
    return this.sendRaw(input)
  }

  testConnection(to: string): Promise<SendEmailResult> {
    return this.sendRaw({
      to,
      subject: 'Web Ranking Reports Email Test',
      html: '<p>This test confirms that Web Ranking Reports can send reports using your connected email account.</p>',
      text: 'This test confirms that Web Ranking Reports can send reports using your connected email account.',
    })
  }
}

/** Exported for unit tests. */
export const _gmailMimeTestUtils = { buildMimeMessage, toUrlSafeBase64, mapGmailApiError }
