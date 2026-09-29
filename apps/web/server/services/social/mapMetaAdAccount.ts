import type PocketBase from 'pocketbase'
import {
  decryptIntegrationToken,
  getAgencyIntegration,
  markMetaReconnectRequired,
} from '~/server/services/social/agencyMetaIntegration'
import {
  createSocialConnection,
  findAuthenticatedMetaAdAccountMappings,
  findMetaAdAccountConnectionAny,
  publicSocialConnection,
  updateSocialConnection,
  type SiteSocialConnectionRow,
} from '~/server/services/social/socialConnections'
import { SocialErrorCode, SocialServiceError } from '~/server/services/social/errors'
import { listMetaAdAccounts, normalizeMetaAdAccountId } from '~/server/utils/metaClient'
import { extractPocketBaseRelationId } from '~/server/utils/workspace'

async function siteOwnerId(pb: PocketBase, siteId: string): Promise<string> {
  const site = await pb.collection('sites').getOne(siteId)
  return extractPocketBaseRelationId((site as { user?: unknown }).user)
}

export async function mapMetaAdAccountToSite(
  pb: PocketBase,
  opts: { agencyOwnerId: string; siteId: string; accountId: string },
): Promise<{ connection: SiteSocialConnectionRow }> {
  const accountId = normalizeMetaAdAccountId(opts.accountId)
  if (!accountId) {
    throw new SocialServiceError({
      code: SocialErrorCode.META_API_ERROR,
      message: 'Ad account id required',
      publicMessage: 'Choose a Meta ad account.',
      httpStatus: 400,
    })
  }

  const ownerId = await siteOwnerId(pb, opts.siteId)
  if (ownerId !== opts.agencyOwnerId) {
    throw new SocialServiceError({
      code: SocialErrorCode.SOCIAL_CONNECTION_NOT_FOUND,
      message: 'Site is not in this workspace',
      publicMessage: 'That site is not in your workspace.',
      httpStatus: 403,
    })
  }

  const integ = await getAgencyIntegration(pb, opts.agencyOwnerId, 'meta')
  if (!integ || integ.status === 'disconnected') {
    throw new SocialServiceError({
      code: SocialErrorCode.META_AUTH_EXPIRED,
      message: 'Meta is not connected',
      httpStatus: 401,
    })
  }

  let accounts
  try {
    accounts = await listMetaAdAccounts(decryptIntegrationToken(integ))
  } catch (e) {
    if (e instanceof SocialServiceError && e.code === SocialErrorCode.META_AUTH_EXPIRED) {
      await markMetaReconnectRequired(pb, integ, e.message)
    }
    throw e
  }

  const account = accounts.find((a) => normalizeMetaAdAccountId(a.account_id) === accountId)
  if (!account) {
    throw new SocialServiceError({
      code: SocialErrorCode.META_PERMISSION_MISSING,
      message: 'Ad account is not in the connected Meta account',
      publicMessage:
        'That ad account is not available. Reconnect Meta and make sure ads_read is granted, then try again.',
      httpStatus: 404,
    })
  }

  const elsewhere = (await findAuthenticatedMetaAdAccountMappings(pb, accountId)).filter(
    (row) => row.site !== opts.siteId,
  )
  for (const row of elsewhere) {
    const otherOwner = await siteOwnerId(pb, row.site)
    if (otherOwner === opts.agencyOwnerId) {
      throw new SocialServiceError({
        code: SocialErrorCode.SOCIAL_DUPLICATE_CONNECTION,
        message: 'Ad account already mapped to another site',
        publicMessage: 'This Meta ad account is already mapped to another site. Remove that mapping first.',
        httpStatus: 409,
      })
    }
  }

  const existing = await findMetaAdAccountConnectionAny(pb, opts.siteId)
  if (existing && existing.status !== 'disconnected' && existing.external_asset_id !== accountId) {
    throw new SocialServiceError({
      code: SocialErrorCode.SOCIAL_DUPLICATE_CONNECTION,
      message: 'Site already has a different Meta ad account',
      publicMessage:
        'This site already has a different Meta ad account connected. Remove it before mapping another account.',
      httpStatus: 409,
    })
  }

  const businessName = account.business?.name || ''
  const patch = {
    agency_integration: integ.id,
    provider: 'meta' as const,
    platform: 'facebook' as const,
    asset_type: 'ad_account' as const,
    access_type: 'authenticated' as const,
    external_asset_id: accountId,
    display_name: account.name || accountId,
    username: '',
    canonical_url: businessName
      ? `https://business.facebook.com/adsmanager/manage/campaigns?act=${accountId}`
      : `https://www.facebook.com/adsmanager/manage/campaigns?act=${accountId}`,
    encrypted_page_token: '',
    status: 'active' as const,
    last_error: '',
  }

  let row: SiteSocialConnectionRow
  if (!existing) {
    row = await createSocialConnection(pb, {
      site: opts.siteId,
      ...patch,
    })
  } else {
    row = await updateSocialConnection(pb, existing.id, patch)
  }

  return { connection: row }
}

export async function unmapMetaAdAccount(
  pb: PocketBase,
  opts: { agencyOwnerId: string; connectionId: string },
): Promise<{ connectionId: string }> {
  const row = await pb.collection('site_social_connections').getOne<SiteSocialConnectionRow>(opts.connectionId)
  if (row.asset_type !== 'ad_account') {
    throw new SocialServiceError({
      code: SocialErrorCode.SOCIAL_CONNECTION_NOT_FOUND,
      message: 'Not a Meta ad account connection',
      publicMessage: 'Ad account connection not found.',
      httpStatus: 404,
    })
  }
  const ownerId = await siteOwnerId(pb, row.site)
  if (ownerId !== opts.agencyOwnerId) {
    throw new SocialServiceError({
      code: SocialErrorCode.SOCIAL_CONNECTION_NOT_FOUND,
      message: 'Connection is not in this workspace',
      publicMessage: 'Ad account connection not found.',
      httpStatus: 403,
    })
  }

  await updateSocialConnection(pb, row.id, {
    status: 'disconnected',
    encrypted_page_token: '',
    agency_integration: '',
    last_error: 'Meta ad account mapping removed.',
  })
  return { connectionId: row.id }
}

export { publicSocialConnection }
