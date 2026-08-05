import type PocketBase from 'pocketbase'
import { decryptEmailCredential } from '~/server/utils/emailCredentialsCrypto'
import {
  getAgencyEmailIntegration,
  isEmailEncryptionConfigured,
  resolveGoogleEmailOauthConfig,
} from '~/server/services/email/agencyEmailIntegration'
import { SystemEmailProvider } from '~/server/services/email/systemEmailProvider'
import { GoogleGmailProvider } from '~/server/services/email/googleGmailProvider'
import type { EmailProvider } from '~/server/services/email/types'
import { EmailDeliveryError } from '~/server/services/email/types'

export type ResolveEmailProviderResult =
  | { ok: true; provider: EmailProvider }
  | { ok: false; error: EmailDeliveryError }

/**
 * Resolve the email provider for a workspace (agency owner user id).
 * Never silently falls back to system when delivery_method is google.
 */
export async function resolveEmailProvider(
  pb: PocketBase,
  agencyOwnerId: string,
): Promise<ResolveEmailProviderResult> {
  const row = await getAgencyEmailIntegration(pb, agencyOwnerId)
  const method = row?.delivery_method === 'google' ? 'google' : 'system'

  if (method === 'system') {
    try {
      const provider = await SystemEmailProvider.create()
      return { ok: true, provider }
    } catch (e) {
      if (e instanceof EmailDeliveryError) return { ok: false, error: e }
      return {
        ok: false,
        error: new EmailDeliveryError({
          category: 'configuration_missing',
          userMessage: 'Web Ranking Reports email is not available.',
          statusCode: 503,
        }),
      }
    }
  }

  // Google selected
  if (!(await resolveGoogleEmailOauthConfig(pb)) || !isEmailEncryptionConfigured()) {
    return {
      ok: false,
      error: new EmailDeliveryError({
        category: 'configuration_missing',
        userMessage:
          'Google email sending is not configured on this server. Contact support or switch to Web Ranking Reports Email.',
        statusCode: 503,
      }),
    }
  }

  if (!row || row.connection_status === 'disconnected') {
    return {
      ok: false,
      error: new EmailDeliveryError({
        category: 'sender_incomplete',
        userMessage: 'Connect a Google Account in Agency → Email Sending before sending reports.',
        statusCode: 400,
      }),
    }
  }

  if (row.connection_status === 'reconnect_required' || row.connection_status === 'error') {
    return {
      ok: false,
      error: new EmailDeliveryError({
        category: 'connection_revoked',
        userMessage: 'Google connection needs to be reconnected in Agency → Email Sending.',
        statusCode: 401,
        technicalDetail: row.last_send_error || undefined,
      }),
    }
  }

  if (!row.sender_email?.trim() || !row.encrypted_access_token?.trim()) {
    return {
      ok: false,
      error: new EmailDeliveryError({
        category: 'sender_incomplete',
        userMessage: 'Google connection is incomplete. Reconnect Google Account.',
        statusCode: 400,
      }),
    }
  }

  if (!row.encrypted_refresh_token?.trim()) {
    return {
      ok: false,
      error: new EmailDeliveryError({
        category: 'missing_refresh_token',
        userMessage: 'Google connection is missing a refresh token. Reconnect Google Account and grant offline access.',
        statusCode: 401,
      }),
    }
  }

  let accessToken: string
  try {
    accessToken = decryptEmailCredential(row.encrypted_access_token)
  } catch {
    return {
      ok: false,
      error: new EmailDeliveryError({
        category: 'token_refresh_failed',
        userMessage: 'Could not unlock stored Google credentials. Reconnect Google Account.',
        statusCode: 500,
      }),
    }
  }

  const provider = new GoogleGmailProvider({
    pb,
    agencyOwnerId,
    row,
    accessToken,
  })
  return { ok: true, provider }
}
