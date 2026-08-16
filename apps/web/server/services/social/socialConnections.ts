import type PocketBase from 'pocketbase'
import { encryptEmailCredential, decryptEmailCredential } from '~/server/utils/emailCredentialsCrypto'
import { COLLECTIONS } from '~/server/services/social/types'
import type {
  SocialAccessType,
  SocialAssetType,
  SocialConnectionStatus,
  SocialPlatform,
  SocialProvider,
} from '~/server/services/social/types'
import { SocialErrorCode, SocialServiceError } from '~/server/services/social/errors'
import { escPbFilterId } from '~/server/utils/workspace'

export type SiteSocialConnectionRow = {
  id: string
  site: string
  agency_integration?: string
  provider: SocialProvider
  platform: SocialPlatform
  asset_type: SocialAssetType
  access_type: SocialAccessType
  external_asset_id: string
  external_parent_asset_id?: string
  display_name?: string
  username?: string
  canonical_url?: string
  encrypted_page_token?: string
  status: SocialConnectionStatus
  last_synced_at?: string
  last_error?: string
  created?: string
  updated?: string
}

export function publicSocialConnection(row: SiteSocialConnectionRow) {
  return {
    id: row.id,
    siteId: row.site,
    provider: row.provider,
    platform: row.platform,
    assetType: row.asset_type,
    accessType: row.access_type,
    externalAssetId: row.external_asset_id,
    displayName: row.display_name || '',
    username: row.username || '',
    canonicalUrl: row.canonical_url || '',
    status: row.status,
    lastSyncedAt: row.last_synced_at || '',
    lastError: row.last_error || '',
    connectedThroughMeta: row.access_type === 'authenticated' && row.status === 'active',
  }
}

export async function listSiteSocialConnections(
  pb: PocketBase,
  siteId: string,
): Promise<SiteSocialConnectionRow[]> {
  return pb.collection(COLLECTIONS.siteSocialConnections).getFullList<SiteSocialConnectionRow>({
    filter: `site = "${escPbFilterId(siteId)}"`,
    sort: 'created',
  })
}

export async function getSocialConnection(
  pb: PocketBase,
  connectionId: string,
): Promise<SiteSocialConnectionRow> {
  return pb.collection(COLLECTIONS.siteSocialConnections).getOne<SiteSocialConnectionRow>(connectionId)
}

export async function findConnectionByAssetId(
  pb: PocketBase,
  siteId: string,
  externalAssetId: string,
): Promise<SiteSocialConnectionRow | null> {
  try {
    return await pb.collection(COLLECTIONS.siteSocialConnections).getFirstListItem<SiteSocialConnectionRow>(
      `site = "${escPbFilterId(siteId)}" && external_asset_id = "${escPbFilterId(externalAssetId)}"`,
    )
  } catch {
    return null
  }
}

export async function findFacebookPageConnectionAny(
  pb: PocketBase,
  siteId: string,
): Promise<SiteSocialConnectionRow | null> {
  try {
    return await pb.collection(COLLECTIONS.siteSocialConnections).getFirstListItem<SiteSocialConnectionRow>(
      `site = "${escPbFilterId(siteId)}" && provider = "meta" && platform = "facebook" && asset_type = "facebook_page"`,
    )
  } catch {
    return null
  }
}

export async function findFacebookPageConnection(
  pb: PocketBase,
  siteId: string,
): Promise<SiteSocialConnectionRow | null> {
  try {
    return await pb.collection(COLLECTIONS.siteSocialConnections).getFirstListItem<SiteSocialConnectionRow>(
      `site = "${escPbFilterId(siteId)}" && provider = "meta" && platform = "facebook" && asset_type = "facebook_page" && status != "disconnected"`,
    )
  } catch {
    return null
  }
}

export async function findAuthenticatedFacebookPageMappings(
  pb: PocketBase,
  pageId: string,
): Promise<SiteSocialConnectionRow[]> {
  try {
    return await pb.collection(COLLECTIONS.siteSocialConnections).getFullList<SiteSocialConnectionRow>({
      filter: `provider = "meta" && platform = "facebook" && asset_type = "facebook_page" && access_type = "authenticated" && external_asset_id = "${escPbFilterId(pageId)}" && status != "disconnected"`,
    })
  } catch {
    return []
  }
}

export async function findFacebookConnectionByUsername(
  pb: PocketBase,
  siteId: string,
  username: string,
): Promise<SiteSocialConnectionRow | null> {
  const u = username.trim().toLowerCase()
  if (!u) return null
  try {
    return await pb.collection(COLLECTIONS.siteSocialConnections).getFirstListItem<SiteSocialConnectionRow>(
      `site = "${escPbFilterId(siteId)}" && platform = "facebook" && asset_type = "facebook_page" && username = "${escPbFilterId(u)}"`,
    )
  } catch {
    return null
  }
}

export async function createSocialConnection(
  pb: PocketBase,
  data: Omit<SiteSocialConnectionRow, 'id' | 'created' | 'updated'>,
): Promise<SiteSocialConnectionRow> {
  const existing = await findConnectionByAssetId(pb, data.site, data.external_asset_id)
  if (existing) {
    throw new SocialServiceError({
      code: SocialErrorCode.SOCIAL_DUPLICATE_CONNECTION,
      message: 'Duplicate social connection',
      httpStatus: 409,
    })
  }
  return pb.collection(COLLECTIONS.siteSocialConnections).create<SiteSocialConnectionRow>(data)
}

export async function updateSocialConnection(
  pb: PocketBase,
  id: string,
  patch: Partial<SiteSocialConnectionRow>,
): Promise<SiteSocialConnectionRow> {
  return pb.collection(COLLECTIONS.siteSocialConnections).update<SiteSocialConnectionRow>(id, patch)
}

export function encryptPageToken(token: string): string {
  return encryptEmailCredential(token)
}

export function decryptPageToken(row: SiteSocialConnectionRow): string | null {
  const enc = (row.encrypted_page_token || '').trim()
  if (!enc) return null
  return decryptEmailCredential(enc)
}

export async function listDueAuthenticatedFacebookConnections(
  pb: PocketBase,
  olderThanIso: string,
): Promise<SiteSocialConnectionRow[]> {
  const filter = [
    'provider = "meta"',
    'platform = "facebook"',
    'asset_type = "facebook_page"',
    'access_type = "authenticated"',
    'status != "disconnected"',
    `(last_synced_at = "" || last_synced_at < "${olderThanIso.replace(/"/g, '\\"')}")`,
  ].join(' && ')
  try {
    return await pb.collection(COLLECTIONS.siteSocialConnections).getFullList<SiteSocialConnectionRow>({
      filter,
      batch: 80,
    })
  } catch {
    return []
  }
}
