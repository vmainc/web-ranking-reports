import type PocketBase from 'pocketbase'
import type {
  AgencyEmailConnectionStatus,
  AgencyEmailIntegrationRecord,
  AgencyEmailSendingSettingsDto,
  EmailDeliveryMethod,
} from '~/server/services/email/types'

export type { AgencyEmailIntegrationRecord, AgencyEmailSendingSettingsDto }

export type AgencyEmailAuditEventType =
  | 'google_connected'
  | 'google_reconnected'
  | 'google_disconnected'
  | 'delivery_method_changed'
  | 'test_email_sent'
  | 'test_email_failed'

const INTEGRATION_COLLECTION = 'agency_email_integrations'
const AUDIT_COLLECTION = 'agency_email_audit_events'

export function isValidEmailAddress(value: string): boolean {
  const v = value.trim()
  if (!v || v.length > 320) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export function sanitizeHtmlTemplate(input: string, maxLen = 5000): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .slice(0, maxLen)
}

export async function getAgencyEmailIntegration(
  pb: PocketBase,
  agencyOwnerId: string,
): Promise<AgencyEmailIntegrationRecord | null> {
  try {
    return await pb.collection(INTEGRATION_COLLECTION).getFirstListItem<AgencyEmailIntegrationRecord>(
      `agency = ${JSON.stringify(agencyOwnerId)}`,
    )
  } catch {
    return null
  }
}

export function toSanitizedEmailSettings(
  row: AgencyEmailIntegrationRecord | null,
  flags: { googleConfigured: boolean; encryptionConfigured: boolean },
): AgencyEmailSendingSettingsDto {
  const deliveryMethod = (row?.delivery_method === 'google' ? 'google' : 'system') as EmailDeliveryMethod
  const status = (row?.connection_status || 'disconnected') as AgencyEmailConnectionStatus
  return {
    deliveryMethod,
    provider: deliveryMethod,
    connectionStatus: status,
    senderEmail: row?.sender_email?.trim() || null,
    senderName: row?.sender_name?.trim() || '',
    replyToEmail: row?.reply_to_email?.trim() || '',
    defaultSubjectTemplate: row?.default_subject_template?.trim() || '',
    defaultMessageTemplate: row?.default_message_template?.trim() || '',
    lastConnectedAt: row?.last_connected_at || null,
    lastTokenRefreshAt: row?.last_token_refresh_at || null,
    lastSuccessfulSendAt: row?.last_successful_send_at || null,
    lastSendError: row?.last_send_error || null,
    lastTestAt: row?.last_test_at || null,
    lastTestStatus: row?.last_test_status || null,
    googleConfigured: flags.googleConfigured,
    encryptionConfigured: flags.encryptionConfigured,
  }
}

export async function upsertAgencyEmailIntegration(
  pb: PocketBase,
  agencyOwnerId: string,
  patch: Record<string, unknown>,
  actorUserId?: string,
): Promise<AgencyEmailIntegrationRecord> {
  const existing = await getAgencyEmailIntegration(pb, agencyOwnerId)
  const data: Record<string, unknown> = {
    ...patch,
    agency: agencyOwnerId,
    ...(actorUserId ? { updated_by: actorUserId } : {}),
  }
  if (existing) {
    return await pb.collection(INTEGRATION_COLLECTION).update<AgencyEmailIntegrationRecord>(existing.id, data)
  }
  return await pb.collection(INTEGRATION_COLLECTION).create<AgencyEmailIntegrationRecord>({
    agency: agencyOwnerId,
    provider: 'system',
    delivery_method: 'system',
    connection_status: 'disconnected',
    ...(actorUserId ? { created_by: actorUserId, updated_by: actorUserId } : {}),
    ...patch,
  })
}

export async function recordAgencyEmailAudit(
  pb: PocketBase,
  opts: {
    agencyOwnerId: string
    actorUserId?: string | null
    eventType: AgencyEmailAuditEventType
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  try {
    await pb.collection(AUDIT_COLLECTION).create({
      agency: opts.agencyOwnerId,
      ...(opts.actorUserId ? { actor: opts.actorUserId } : {}),
      event_type: opts.eventType,
      metadata_json: opts.metadata ?? {},
    })
  } catch (e) {
    console.warn('[agency-email-audit] failed to write audit event', opts.eventType, e instanceof Error ? e.message : e)
  }
}

export function getGoogleEmailOauthConfig(): {
  client_id: string
  client_secret: string
  redirect_uri: string
} | null {
  const config = useRuntimeConfig()
  const env = typeof process !== 'undefined' && process.env ? process.env : {}
  // Prefer runtimeConfig (NUXT_* / build), then plain env from Docker env_file (GOOGLE_*).
  const client_id = String(
    config.googleEmailClientId ||
      env.GOOGLE_CLIENT_ID ||
      env.NUXT_GOOGLE_CLIENT_ID ||
      env.NUXT_GOOGLE_EMAIL_CLIENT_ID ||
      '',
  ).trim()
  const client_secret = String(
    config.googleEmailClientSecret ||
      env.GOOGLE_CLIENT_SECRET ||
      env.NUXT_GOOGLE_CLIENT_SECRET ||
      env.NUXT_GOOGLE_EMAIL_CLIENT_SECRET ||
      '',
  ).trim()
  const redirect_uri = String(
    config.googleEmailOauthRedirectUri ||
      env.GOOGLE_OAUTH_REDIRECT_URI ||
      env.NUXT_GOOGLE_OAUTH_REDIRECT_URI ||
      env.NUXT_GOOGLE_EMAIL_OAUTH_REDIRECT_URI ||
      '',
  ).trim()
  if (!client_id || !client_secret || !redirect_uri) return null
  return { client_id, client_secret, redirect_uri }
}

export function isEmailEncryptionConfigured(): boolean {
  try {
    const config = useRuntimeConfig()
    const fromConfig = String(config.emailCredentialsEncryptionKey || '').trim()
    if (fromConfig.length >= 16) return true
  } catch {
    // outside Nitro
  }
  const env = typeof process !== 'undefined' && process.env ? process.env : {}
  const fromEnv = (
    env.EMAIL_CREDENTIALS_ENCRYPTION_KEY ||
    env.NUXT_EMAIL_CREDENTIALS_ENCRYPTION_KEY ||
    ''
  ).trim()
  return fromEnv.length >= 16
}

export const GMAIL_SEND_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/gmail.send',
] as const
