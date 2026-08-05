/** Shared types for agency email delivery providers (server-only). */

export type EmailDeliveryMethod = 'system' | 'google'
export type EmailProviderId = 'system' | 'google'

export type AgencyEmailConnectionStatus =
  | 'disconnected'
  | 'connected'
  | 'reconnect_required'
  | 'error'

export type EmailErrorCategory =
  | 'authorization_denied'
  | 'oauth_state_expired'
  | 'oauth_state_invalid'
  | 'missing_refresh_token'
  | 'connection_revoked'
  | 'insufficient_permissions'
  | 'token_refresh_failed'
  | 'rate_limited'
  | 'attachment_too_large'
  | 'provider_unavailable'
  | 'sender_incomplete'
  | 'configuration_missing'
  | 'send_failed'
  | 'unknown'

export interface EmailAttachment {
  filename: string
  content: Buffer
  contentType?: string
}

export interface SendEmailInput {
  to: string | string[]
  subject: string
  html: string
  text?: string
  fromName?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  attachments?: EmailAttachment[]
}

export interface SendEmailResult {
  provider: EmailProviderId
  senderEmail: string
  messageId?: string
  recipientCount: number
}

export interface EmailProvider {
  readonly id: EmailProviderId
  readonly senderEmail: string
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>
  sendReportEmail(input: SendEmailInput): Promise<SendEmailResult>
  testConnection(to: string): Promise<SendEmailResult>
}

export class EmailDeliveryError extends Error {
  readonly category: EmailErrorCategory
  readonly userMessage: string
  readonly statusCode: number
  readonly technicalDetail?: string

  constructor(opts: {
    category: EmailErrorCategory
    userMessage: string
    statusCode?: number
    technicalDetail?: string
  }) {
    super(opts.userMessage)
    this.name = 'EmailDeliveryError'
    this.category = opts.category
    this.userMessage = opts.userMessage
    this.statusCode = opts.statusCode ?? 502
    this.technicalDetail = opts.technicalDetail
  }
}

/** Sanitized settings returned to the browser (no tokens). */
export interface AgencyEmailSendingSettingsDto {
  deliveryMethod: EmailDeliveryMethod
  provider: EmailProviderId
  connectionStatus: AgencyEmailConnectionStatus
  senderEmail: string | null
  senderName: string
  replyToEmail: string
  defaultSubjectTemplate: string
  defaultMessageTemplate: string
  lastConnectedAt: string | null
  lastTokenRefreshAt: string | null
  lastSuccessfulSendAt: string | null
  lastSendError: string | null
  lastTestAt: string | null
  lastTestStatus: string | null
  googleConfigured: boolean
  encryptionConfigured: boolean
}

export interface AgencyEmailIntegrationRecord {
  id: string
  agency: string
  provider?: string
  delivery_method?: string
  sender_email?: string | null
  sender_name?: string | null
  reply_to_email?: string | null
  default_subject_template?: string | null
  default_message_template?: string | null
  encrypted_access_token?: string | null
  encrypted_refresh_token?: string | null
  token_expiry?: string | null
  scopes?: string | null
  google_account_id?: string | null
  connection_status?: string | null
  last_connected_at?: string | null
  last_token_refresh_at?: string | null
  last_successful_send_at?: string | null
  last_send_error?: string | null
  last_test_at?: string | null
  last_test_status?: string | null
  created_by?: string | null
  updated_by?: string | null
}
