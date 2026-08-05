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
  flags: { googleConfigured: boolean; encryptionConfigured: boolean; oauthRedirectUri?: string },
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
    oauthRedirectUri: flags.oauthRedirectUri || getEmailSendingOauthRedirectUri(),
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
  try {
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const any = e as {
      status?: number
      statusCode?: number
      response?: { message?: string; code?: number; data?: unknown }
      url?: string
    }
    const status = any.statusCode ?? any.status ?? any.response?.code
    const responseMsg = typeof any.response?.message === 'string' ? any.response.message : ''
    const detail = [msg, responseMsg, status ? `status ${status}` : ''].filter(Boolean).join(' | ')

    // Only treat as "missing collection" when PB actually says so — do NOT match on the
    // collection name alone (ClientResponseError.url often contains it for any record error).
    const missingCollection =
      status === 404 ||
      /Missing collection|collection.*wasn't found|wasn't found.*collection/i.test(`${msg} ${responseMsg}`)

    if (missingCollection) {
      throw createError({
        statusCode: 503,
        message:
          'Email Sending database tables are missing. On the VPS run: ./infra/run-agency-email-collections.sh then retry.',
      })
    }
    console.error('[agency-email-integrations] upsert failed', detail.slice(0, 500))
    throw createError({
      statusCode: typeof status === 'number' && status >= 400 && status < 600 ? status : 502,
      message: responseMsg || msg || 'Could not save Google email connection to PocketBase.',
      data: { detail: detail.slice(0, 300) },
    })
  }
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

export type GoogleEmailOauthConfig = {
  client_id: string
  client_secret: string
  redirect_uri: string
}

function readEnv(key: string): string {
  if (typeof process === 'undefined' || !process.env) return ''
  return (process.env[key] ?? '').trim()
}

function appPublicUrl(): string {
  try {
    const config = useRuntimeConfig()
    return String(
      (config.public as { appUrl?: string })?.appUrl || config.appUrl || '',
    )
      .trim()
      .replace(/\/+$/, '')
  } catch {
    return (readEnv('APP_URL') || readEnv('NUXT_PUBLIC_APP_URL') || '').replace(/\/+$/, '')
  }
}

/** True only for the Agency Email Sending callback — never Analytics `/api/google/callback`. */
function isEmailSendingRedirectUri(uri: string): boolean {
  try {
    const path = new URL(uri).pathname.replace(/\/+$/, '')
    return path.endsWith('/api/agency/email-sending/google/callback')
  } catch {
    return uri.includes('/api/agency/email-sending/google/callback')
  }
}

function emailSendingRedirectUri(): string {
  const candidates: string[] = []
  try {
    const config = useRuntimeConfig()
    candidates.push(String(config.googleEmailOauthRedirectUri || '').trim())
  } catch {
    // ignore
  }
  candidates.push(
    readEnv('NUXT_GOOGLE_EMAIL_OAUTH_REDIRECT_URI'),
    readEnv('GOOGLE_EMAIL_OAUTH_REDIRECT_URI'),
    readEnv('GOOGLE_OAUTH_REDIRECT_URI'),
    readEnv('NUXT_GOOGLE_OAUTH_REDIRECT_URI'),
  )
  for (const c of candidates) {
    if (c && isEmailSendingRedirectUri(c)) return c
  }
  // Ignore Analytics redirect if GOOGLE_OAUTH_REDIRECT_URI points at /api/google/callback
  const base = appPublicUrl() || 'https://webrankingreports.com'
  return `${base}/api/agency/email-sending/google/callback`
}

/** Public redirect URI used for Gmail connect (safe to show in UI). */
export function getEmailSendingOauthRedirectUri(): string {
  return emailSendingRedirectUri()
}

/**
 * Sync env/runtimeConfig-only lookup (no PocketBase). Prefer {@link resolveGoogleEmailOauthConfig}.
 */
export function getGoogleEmailOauthConfig(): GoogleEmailOauthConfig | null {
  try {
    const config = useRuntimeConfig()
    const client_id = String(
      config.googleEmailClientId ||
        readEnv('GOOGLE_CLIENT_ID') ||
        readEnv('NUXT_GOOGLE_CLIENT_ID') ||
        readEnv('NUXT_GOOGLE_EMAIL_CLIENT_ID') ||
        '',
    ).trim()
    const client_secret = String(
      config.googleEmailClientSecret ||
        readEnv('GOOGLE_CLIENT_SECRET') ||
        readEnv('NUXT_GOOGLE_CLIENT_SECRET') ||
        readEnv('NUXT_GOOGLE_EMAIL_CLIENT_SECRET') ||
        '',
    ).trim()
    const redirect_uri = emailSendingRedirectUri()
    if (!client_id || !client_secret || !redirect_uri) return null
    return { client_id, client_secret, redirect_uri }
  } catch {
    const client_id =
      readEnv('GOOGLE_CLIENT_ID') || readEnv('NUXT_GOOGLE_CLIENT_ID') || readEnv('NUXT_GOOGLE_EMAIL_CLIENT_ID')
    const client_secret =
      readEnv('GOOGLE_CLIENT_SECRET') ||
      readEnv('NUXT_GOOGLE_CLIENT_SECRET') ||
      readEnv('NUXT_GOOGLE_EMAIL_CLIENT_SECRET')
    const redirect_uri = emailSendingRedirectUri()
    if (!client_id || !client_secret || !redirect_uri) return null
    return { client_id, client_secret, redirect_uri }
  }
}

/**
 * Resolve Gmail OAuth client: env first, then production Analytics credentials in
 * PocketBase `app_settings` key `google_oauth` (client_id / client_secret only).
 * Redirect URI is always the Email Sending callback (not the Analytics callback).
 */
export async function resolveGoogleEmailOauthConfig(
  pb?: PocketBase | null,
): Promise<GoogleEmailOauthConfig | null> {
  const fromEnv = getGoogleEmailOauthConfig()
  if (fromEnv) return fromEnv

  if (!pb) return null
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value?: unknown }>('key="google_oauth"')
    const raw = row?.value
    const value =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as { client_id?: string; client_secret?: string })
        : null
    const client_id = String(value?.client_id || '').trim()
    const client_secret = String(value?.client_secret || '').trim()
    const redirect_uri = emailSendingRedirectUri()
    if (!client_id || !client_secret || !redirect_uri) return null
    return { client_id, client_secret, redirect_uri }
  } catch {
    return null
  }
}

export function isEmailEncryptionConfigured(): boolean {
  try {
    const config = useRuntimeConfig()
    const fromConfig = String(config.emailCredentialsEncryptionKey || '').trim()
    if (fromConfig.length >= 16) return true
    const fromState = String(config.stateSigningSecret || '').trim()
    if (fromState.length >= 16) return true
  } catch {
    // outside Nitro
  }
  const fromEnv = (
    readEnv('EMAIL_CREDENTIALS_ENCRYPTION_KEY') ||
    readEnv('NUXT_EMAIL_CREDENTIALS_ENCRYPTION_KEY') ||
    readEnv('STATE_SIGNING_SECRET') ||
    readEnv('NUXT_STATE_SIGNING_SECRET') ||
    ''
  ).trim()
  return fromEnv.length >= 16
}

export const GMAIL_SEND_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/gmail.send',
] as const
