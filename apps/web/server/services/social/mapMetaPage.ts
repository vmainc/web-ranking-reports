import type PocketBase from 'pocketbase'
import {
  decryptIntegrationToken,
  getAgencyIntegration,
  markMetaReconnectRequired,
} from '~/server/services/social/agencyMetaIntegration'
import { connectionMatchesMetaPage } from '~/server/services/social/facebookPageMatch'
import {
  createSocialConnection,
  encryptPageToken,
  findAuthenticatedFacebookPageMappings,
  findFacebookPageConnectionAny,
  listSiteSocialConnections,
  publicSocialConnection,
  updateSocialConnection,
  type SiteSocialConnectionRow,
} from '~/server/services/social/socialConnections'
import { SocialErrorCode, SocialServiceError } from '~/server/services/social/errors'
import { listMetaManagedPages } from '~/server/utils/metaClient'
import { extractPocketBaseRelationId, escPbFilterId } from '~/server/utils/workspace'
import { syncFacebookConnection } from '~/server/services/social/syncFacebook'

export type MapPageDecision =
  | { action: 'create' }
  | { action: 'upgrade'; connectionId: string }
  | { action: 'update'; connectionId: string }
  | { action: 'conflict_authenticated'; connectionId: string }
  | { action: 'conflict_public'; connectionId: string }

/** Public → authenticated upgrade keeps the same connection id (and therefore snapshots). */
export function decideMetaPageMapping(opts: {
  existing: { id: string; access_type: string; status: string } | null
  identityMatches: boolean
}): MapPageDecision {
  const existing = opts.existing
  if (!existing) return { action: 'create' }
  const active = existing.status !== 'disconnected'
  if (active && existing.access_type === 'authenticated' && !opts.identityMatches) {
    return { action: 'conflict_authenticated', connectionId: existing.id }
  }
  if (active && existing.access_type === 'public' && !opts.identityMatches) {
    return { action: 'conflict_public', connectionId: existing.id }
  }
  if (active && existing.access_type === 'public' && opts.identityMatches) {
    return { action: 'upgrade', connectionId: existing.id }
  }
  return { action: 'update', connectionId: existing.id }
}

export type ReconnectPagePlanItem = {
  connectionId: string
  pageId: string
  action: 'refresh_token' | 'mark_reconnect_required' | 'skip'
  displayName?: string
  username?: string
  canonicalUrl?: string
  accessToken?: string
}

/** Reconnect refreshes Page tokens by Meta Page id. Same row, no duplicate mappings, snapshots untouched. */
export function planReconnectPageTokens(opts: {
  connections: Array<{
    id: string
    external_asset_id: string
    access_type: string
    status: string
    canonical_url?: string
  }>
  pages: Array<{ id: string; access_token?: string; name?: string; username?: string; link?: string }>
}): ReconnectPagePlanItem[] {
  const byId = new Map(opts.pages.map((p) => [p.id, p]))
  const out: ReconnectPagePlanItem[] = []
  for (const conn of opts.connections) {
    if (conn.access_type !== 'authenticated' || conn.status === 'disconnected') {
      out.push({ connectionId: conn.id, pageId: conn.external_asset_id, action: 'skip' })
      continue
    }
    const page = byId.get(conn.external_asset_id)
    if (page?.access_token) {
      out.push({
        connectionId: conn.id,
        pageId: page.id,
        action: 'refresh_token',
        displayName: page.name,
        username: (page.username || '').toLowerCase(),
        canonicalUrl: page.link || conn.canonical_url,
        accessToken: page.access_token,
      })
    } else {
      out.push({
        connectionId: conn.id,
        pageId: conn.external_asset_id,
        action: 'mark_reconnect_required',
      })
    }
  }
  return out
}

async function siteOwnerId(pb: PocketBase, siteId: string): Promise<string> {
  const site = await pb.collection('sites').getOne(siteId)
  return extractPocketBaseRelationId((site as { user?: unknown }).user)
}

export async function mapMetaPageToSite(
  pb: PocketBase,
  opts: { agencyOwnerId: string; siteId: string; pageId: string },
): Promise<{ connection: SiteSocialConnectionRow; upgraded: boolean }> {
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

  let pages
  try {
    pages = await listMetaManagedPages(decryptIntegrationToken(integ))
  } catch (e) {
    if (e instanceof SocialServiceError && e.code === SocialErrorCode.META_AUTH_EXPIRED) {
      await markMetaReconnectRequired(pb, integ, e.message)
    }
    throw e
  }

  const page = pages.find((p) => p.id === opts.pageId)
  if (!page) {
    throw new SocialServiceError({
      code: SocialErrorCode.META_PAGE_ACCESS_REMOVED,
      message: 'Page is not in the connected Meta account',
      httpStatus: 404,
    })
  }
  if (!page.access_token) {
    throw new SocialServiceError({
      code: SocialErrorCode.META_PERMISSION_MISSING,
      message: 'No Page access token returned',
      httpStatus: 403,
    })
  }

  const elsewhere = (await findAuthenticatedFacebookPageMappings(pb, page.id)).filter((row) => row.site !== opts.siteId)
  for (const row of elsewhere) {
    const otherOwner = await siteOwnerId(pb, row.site)
    if (otherOwner === opts.agencyOwnerId) {
      throw new SocialServiceError({
        code: SocialErrorCode.SOCIAL_DUPLICATE_CONNECTION,
        message: 'Page already mapped to another site',
        publicMessage: 'This Facebook Page is already mapped to another site. Remove that mapping first.',
        httpStatus: 409,
      })
    }
  }

  const existing = await findFacebookPageConnectionAny(pb, opts.siteId)
  const identityMatches = existing ? connectionMatchesMetaPage(existing, page) : true
  const decision = decideMetaPageMapping({
    existing: existing ? { id: existing.id, access_type: existing.access_type, status: existing.status } : null,
    identityMatches,
  })
  if (decision.action === 'conflict_authenticated') {
    throw new SocialServiceError({
      code: SocialErrorCode.SOCIAL_DUPLICATE_CONNECTION,
      message: 'Site already has a different Facebook Page',
      publicMessage: 'This site already has a different Facebook Page connected. Remove it before mapping another Page.',
      httpStatus: 409,
    })
  }
  if (decision.action === 'conflict_public') {
    throw new SocialServiceError({
      code: SocialErrorCode.SOCIAL_DUPLICATE_CONNECTION,
      message: 'Public Facebook connection does not match this Meta Page',
      publicMessage:
        'This site already tracks a Facebook Page that does not match the selected Meta Page. Remove the existing connection or pick the matching Page.',
      httpStatus: 409,
    })
  }

  const patch = {
    agency_integration: integ.id,
    provider: 'meta' as const,
    platform: 'facebook' as const,
    asset_type: 'facebook_page' as const,
    access_type: 'authenticated' as const,
    external_asset_id: page.id,
    display_name: page.name,
    username: (page.username || '').toLowerCase(),
    canonical_url: page.link || `https://www.facebook.com/${page.id}`,
    encrypted_page_token: encryptPageToken(page.access_token),
    status: 'active' as const,
    last_error: '',
  }

  let row: SiteSocialConnectionRow
  const upgraded = decision.action === 'upgrade'
  if (decision.action === 'create') {
    row = await createSocialConnection(pb, {
      site: opts.siteId,
      ...patch,
    })
  } else {
    row = await updateSocialConnection(pb, decision.connectionId, patch)
    if (upgraded) {
      console.info('[social.facebook.connection.upgraded]', {
        agencyId: opts.agencyOwnerId,
        siteId: opts.siteId,
        connectionId: row.id,
        pageId: page.id,
      })
    }
  }

  await syncFacebookConnection(pb, row)
  const refreshed = await pb
    .collection('site_social_connections')
    .getOne<SiteSocialConnectionRow>(row.id)
    .catch(() => row)
  return { connection: refreshed, upgraded }
}

export async function unmapMetaPage(
  pb: PocketBase,
  opts: { agencyOwnerId: string; connectionId: string },
): Promise<{ connectionId: string }> {
  const row = await pb.collection('site_social_connections').getOne<SiteSocialConnectionRow>(opts.connectionId)
  const ownerId = await siteOwnerId(pb, row.site)
  if (ownerId !== opts.agencyOwnerId) {
    throw new SocialServiceError({
      code: SocialErrorCode.SOCIAL_CONNECTION_NOT_FOUND,
      message: 'Connection is not in this workspace',
      publicMessage: 'Social connection not found.',
      httpStatus: 403,
    })
  }

  if (row.canonical_url || row.username) {
    await updateSocialConnection(pb, row.id, {
      access_type: 'public',
      agency_integration: '',
      encrypted_page_token: '',
      status: 'metrics_unavailable',
      last_error: 'Meta mapping removed. Public metric collection is not currently available.',
    })
  } else {
    await updateSocialConnection(pb, row.id, {
      status: 'disconnected',
      encrypted_page_token: '',
      agency_integration: '',
      last_error: 'Meta mapping removed.',
    })
  }
  return { connectionId: row.id }
}

export async function refreshMappedPageTokensAfterOAuth(
  pb: PocketBase,
  agencyOwnerId: string,
  pages: Array<{ id: string; access_token?: string; name?: string; username?: string; link?: string }>,
): Promise<{ refreshed: number; reconnectRequired: number }> {
  const sites = await pb.collection('sites').getFullList<{ id: string }>({
    filter: `user = "${escPbFilterId(agencyOwnerId)}"`,
    fields: 'id',
  })
  const connections: SiteSocialConnectionRow[] = []
  for (const site of sites) {
    const conns = await listSiteSocialConnections(pb, site.id).catch(() => [])
    connections.push(...conns)
  }
  const plan = planReconnectPageTokens({ connections, pages })
  let refreshed = 0
  let reconnectRequired = 0
  for (const item of plan) {
    if (item.action === 'refresh_token' && item.accessToken) {
      await updateSocialConnection(pb, item.connectionId, {
        encrypted_page_token: encryptPageToken(item.accessToken),
        display_name: item.displayName || '',
        username: item.username || '',
        canonical_url: item.canonicalUrl || '',
        status: 'active',
        last_error: '',
      })
      refreshed += 1
    } else if (item.action === 'mark_reconnect_required') {
      await updateSocialConnection(pb, item.connectionId, {
        status: 'reconnect_required',
        last_error: 'This Facebook Page is no longer accessible with the connected Meta account.',
      })
      reconnectRequired += 1
    }
  }
  return { refreshed, reconnectRequired }
}

export { publicSocialConnection }
