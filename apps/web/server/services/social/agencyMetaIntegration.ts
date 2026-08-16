import type PocketBase from 'pocketbase'
import { encryptEmailCredential, decryptEmailCredential } from '~/server/utils/emailCredentialsCrypto'
import { COLLECTIONS } from '~/server/services/social/types'
import type { AgencyIntegrationStatus, SocialProvider } from '~/server/services/social/types'
import { SocialErrorCode, SocialServiceError } from '~/server/services/social/errors'
import { escPbFilterId } from '~/server/utils/workspace'

export type AgencyIntegrationRow = {
  id: string
  agency: string
  provider: SocialProvider
  external_user_id?: string
  external_business_id?: string
  display_name?: string
  encrypted_access_token?: string
  token_expires_at?: string
  scopes?: string
  status: AgencyIntegrationStatus
  last_verified_at?: string
  last_error?: string
  created_by?: string
  updated_by?: string
}

export async function getAgencyIntegration(
  pb: PocketBase,
  agencyOwnerId: string,
  provider: SocialProvider = 'meta',
): Promise<AgencyIntegrationRow | null> {
  try {
    return await pb.collection(COLLECTIONS.agencyIntegrations).getFirstListItem<AgencyIntegrationRow>(
      `agency = "${escPbFilterId(agencyOwnerId)}" && provider = "${provider}"`,
    )
  } catch {
    return null
  }
}

export async function upsertAgencyMetaIntegration(
  pb: PocketBase,
  agencyOwnerId: string,
  patch: Partial<AgencyIntegrationRow> & { encrypted_access_token?: string },
): Promise<AgencyIntegrationRow> {
  const existing = await getAgencyIntegration(pb, agencyOwnerId, 'meta')
  const body = { ...patch, agency: agencyOwnerId, provider: 'meta' as const }
  if (existing) {
    return pb.collection(COLLECTIONS.agencyIntegrations).update<AgencyIntegrationRow>(existing.id, body)
  }
  return pb.collection(COLLECTIONS.agencyIntegrations).create<AgencyIntegrationRow>({
    status: 'disconnected',
    ...body,
  })
}

export function decryptIntegrationToken(row: AgencyIntegrationRow): string {
  const enc = (row.encrypted_access_token || '').trim()
  if (!enc) {
    throw new SocialServiceError({
      code: SocialErrorCode.META_AUTH_EXPIRED,
      message: 'No Meta access token stored',
      httpStatus: 401,
    })
  }
  return decryptEmailCredential(enc)
}

export function encryptIntegrationToken(token: string): string {
  return encryptEmailCredential(token)
}

export function publicAgencyIntegration(row: AgencyIntegrationRow | null) {
  if (!row) {
    return {
      connected: false,
      status: 'disconnected' as const,
      displayName: '',
      lastVerifiedAt: '',
      reconnectRequired: false,
    }
  }
  return {
    connected: row.status === 'connected',
    status: row.status,
    displayName: row.display_name || '',
    lastVerifiedAt: row.last_verified_at || '',
    reconnectRequired: row.status === 'reconnect_required' || row.status === 'expired',
    lastError: row.last_error || '',
    externalUserId: row.external_user_id || '',
  }
}

export async function markMetaReconnectRequired(
  pb: PocketBase,
  row: AgencyIntegrationRow,
  lastError: string,
): Promise<void> {
  await pb.collection(COLLECTIONS.agencyIntegrations).update(row.id, {
    status: 'reconnect_required',
    last_error: lastError.slice(0, 500),
  })
}
