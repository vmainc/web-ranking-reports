import type PocketBase from 'pocketbase'
import { getFacebookPublicPageProvider, publicMetricsUnavailableReason } from '~/server/services/social/providers/facebookPublic'
import {
  createSocialConnection,
  findFacebookPageConnection,
  findFacebookPageConnectionAny,
  publicSocialConnection,
  updateSocialConnection,
} from '~/server/services/social/socialConnections'
import { SocialErrorCode, SocialServiceError, isSocialServiceError } from '~/server/services/social/errors'
import { metricAvailable } from '~/server/services/social/metrics/normalize'
import { upsertSocialMetricSnapshot } from '~/server/services/social/snapshots'
import { FACEBOOK_PAGE_METRICS } from '~/server/services/social/metrics/registry'

export async function resolveAndCreatePublicFacebookConnection(
  pb: PocketBase,
  opts: { siteId: string; url: string },
) {
  const existing = await findFacebookPageConnectionAny(pb, opts.siteId)
  if (existing && existing.status !== 'disconnected') {
    throw new SocialServiceError({
      code: SocialErrorCode.SOCIAL_DUPLICATE_CONNECTION,
      message: 'Site already has a Facebook Page connection',
      httpStatus: 409,
    })
  }

  const provider = getFacebookPublicPageProvider()
  let resolved
  try {
    resolved = await provider.resolvePage(opts.url)
  } catch (e) {
    console.warn('[social.facebook.public.resolve_failed]', {
      siteId: opts.siteId,
      code: isSocialServiceError(e) ? e.code : 'unknown',
    })
    throw e
  }

  const profile = await provider.fetchProfile(resolved)
  const metrics = await provider.fetchMetrics(resolved)
  const followersAvailable = metricAvailable(metrics.followers)
  const collectedAt = new Date().toISOString()

  const payload = {
    site: opts.siteId,
    provider: 'meta' as const,
    platform: 'facebook' as const,
    asset_type: 'facebook_page' as const,
    access_type: 'public' as const,
    external_asset_id:
      resolved.externalId || `fb_url:${(resolved.username || resolved.canonicalUrl).toLowerCase()}`,
    display_name: profile.displayName,
    username: (profile.username || resolved.username || '').toLowerCase(),
    canonical_url: profile.canonicalUrl,
    status: (followersAvailable ? 'active' : 'metrics_unavailable') as const,
    last_synced_at: collectedAt,
    last_error: followersAvailable ? '' : publicMetricsUnavailableReason(),
    encrypted_page_token: '',
    agency_integration: '',
  }

  const row = existing
    ? await updateSocialConnection(pb, existing.id, payload)
    : await createSocialConnection(pb, payload)

  if (followersAvailable && metrics.followers) {
    await upsertSocialMetricSnapshot(pb, {
      siteId: opts.siteId,
      connectionId: row.id,
      provider: 'meta',
      platform: 'facebook',
      assetType: 'facebook_page',
      metric: metrics.followers,
      snapshotDate: collectedAt.slice(0, 10),
    })
  }

  console.info('[social.facebook.public.resolved]', {
    siteId: opts.siteId,
    connectionId: row.id,
    provider: provider.id,
    publicMetricsAvailable: followersAvailable,
  })

  return {
    connection: publicSocialConnection(row),
    resolved,
    publicMetricsAvailable: followersAvailable,
    publicMetricsUnavailableReason: followersAvailable ? '' : publicMetricsUnavailableReason(),
  }
}
