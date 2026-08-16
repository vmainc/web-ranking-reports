import type PocketBase from 'pocketbase'
import { FACEBOOK_PAGE_METRICS } from '~/server/services/social/metrics/registry'
import { normalizedMetric } from '~/server/services/social/metrics/normalize'
import { upsertSocialMetricSnapshot } from '~/server/services/social/snapshots'
import {
  decryptPageToken,
  type SiteSocialConnectionRow,
  updateSocialConnection,
} from '~/server/services/social/socialConnections'
import { markMetaReconnectRequired } from '~/server/services/social/agencyMetaIntegration'
import { fetchPageMetrics, fetchRecentPosts } from '~/server/services/social/providers/metaFacebookPage'
import { SocialErrorCode, SocialServiceError, isSocialServiceError } from '~/server/services/social/errors'
import { extractPocketBaseRelationId } from '~/server/utils/workspace'
import {
  acquireFacebookSyncLock,
  releaseFacebookSyncLock,
  releaseInProcessFacebookSyncLock,
  tryAcquireInProcessFacebookSyncLock,
} from '~/server/services/social/socialSyncLock'

function daysAgoUtc(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function syncFacebookConnection(
  pb: PocketBase,
  row: SiteSocialConnectionRow,
): Promise<{ ok: boolean; metricsStored: number; error?: string }> {
  const collectedAt = new Date().toISOString()
  const range = { start: daysAgoUtc(27), end: todayUtc() }
  let stored = 0

  try {
    if (row.access_type === 'public') {
      await updateSocialConnection(pb, row.id, {
        status: 'metrics_unavailable',
        last_synced_at: collectedAt,
        last_error: 'Public Facebook metrics are not currently available.',
      })
      return { ok: true, metricsStored: 0 }
    }

    const pageId = row.external_asset_id
    if (!pageId || pageId.startsWith('fb_url:')) {
      throw new SocialServiceError({
        code: SocialErrorCode.META_PAGE_ACCESS_REMOVED,
        message: 'Authenticated connection is missing a Meta Page id',
        httpStatus: 400,
      })
    }

    const pageToken = decryptPageToken(row)
    if (!pageToken) {
      throw new SocialServiceError({
        code: SocialErrorCode.META_AUTH_EXPIRED,
        message: 'Page access token missing — reconnect Meta',
        httpStatus: 401,
      })
    }

    const metrics = await fetchPageMetrics({
      pageId,
      pageAccessToken: pageToken,
      range,
      collectedAt,
    })
    for (const metric of metrics) {
      const res = await upsertSocialMetricSnapshot(pb, {
        siteId: row.site,
        connectionId: row.id,
        provider: row.provider,
        platform: row.platform,
        assetType: row.asset_type,
        metric,
        snapshotDate: todayUtc(),
      })
      if (res.id) stored += 1
    }

    try {
      const { publishedCount } = await fetchRecentPosts({
        pageId,
        pageAccessToken: pageToken,
        range,
      })
      const postsMetric = normalizedMetric({
        key: FACEBOOK_PAGE_METRICS.postsPublished.key,
        raw: publishedCount,
        source: 'meta_graph',
        collectedAt,
        periodType: 'range',
        periodStart: range.start,
        periodEnd: range.end,
        isExact: true,
      })
      const res = await upsertSocialMetricSnapshot(pb, {
        siteId: row.site,
        connectionId: row.id,
        provider: row.provider,
        platform: row.platform,
        assetType: row.asset_type,
        metric: postsMetric,
        snapshotDate: todayUtc(),
      })
      if (res.id) stored += 1
    } catch (e) {
      console.warn('[social.facebook.sync.posts_failed]', {
        connectionId: row.id,
        pageId,
        code: isSocialServiceError(e) ? e.code : 'unknown',
      })
    }

    await updateSocialConnection(pb, row.id, {
      status: 'active',
      last_synced_at: collectedAt,
      last_error: '',
    })
    console.info('[social.facebook.sync.completed]', {
      connectionId: row.id,
      siteId: row.site,
      pageId,
      metricsStored: stored,
    })
    return { ok: true, metricsStored: stored }
  } catch (e) {
    const code = isSocialServiceError(e) ? e.code : SocialErrorCode.SOCIAL_SYNC_ERROR
    const message = isSocialServiceError(e) ? e.publicMessage : 'Social sync failed'
    console.warn('[social.facebook.sync.failed]', {
      connectionId: row.id,
      siteId: row.site,
      pageId: row.external_asset_id,
      code,
    })
    await updateSocialConnection(pb, row.id, {
      status: code === SocialErrorCode.META_AUTH_EXPIRED ? 'reconnect_required' : 'error',
      last_error: message.slice(0, 500),
      last_synced_at: collectedAt,
    })
    if (code === SocialErrorCode.META_AUTH_EXPIRED && row.agency_integration) {
      const integId = extractPocketBaseRelationId(row.agency_integration)
      if (integId) {
        try {
          const integ = await pb.collection('agency_integrations').getOne(integId)
          await markMetaReconnectRequired(
            pb,
            integ as Parameters<typeof markMetaReconnectRequired>[1],
            message,
          )
        } catch {
          /* ignore */
        }
      }
    }
    return { ok: false, metricsStored: stored, error: message }
  }
}

export async function runDueFacebookSync(pb: PocketBase): Promise<{
  processed: number
  failed: number
  skipped?: 'lock'
}> {
  const owner = `facebook-sync:${process.pid}:${Date.now()}`
  if (!tryAcquireInProcessFacebookSyncLock(owner)) {
    console.info('[social.facebook.sync.started]', { skipped: 'lock', reason: 'in_process' })
    return { processed: 0, failed: 0, skipped: 'lock' }
  }

  const lock = await acquireFacebookSyncLock(pb, owner)
  if (!lock.acquired) {
    releaseInProcessFacebookSyncLock(owner)
    console.info('[social.facebook.sync.started]', { skipped: 'lock', reason: lock.reason })
    return { processed: 0, failed: 0, skipped: 'lock' }
  }

  try {
    const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
    let rows: SiteSocialConnectionRow[] = []
    try {
      rows = await pb.collection('site_social_connections').getFullList<SiteSocialConnectionRow>({
        filter:
          'provider = "meta" && platform = "facebook" && asset_type = "facebook_page" && access_type = "authenticated" && status != "disconnected"',
        batch: 100,
      })
    } catch (e) {
      console.warn('[social.facebook.sync.started]', { error: 'collection_missing' })
      return { processed: 0, failed: 0 }
    }

    const due = rows.filter((r) => !r.last_synced_at || r.last_synced_at < cutoff)
    console.info('[social.facebook.sync.started]', { due: due.length, total: rows.length })
    let failed = 0
    for (const row of due) {
      try {
        const res = await syncFacebookConnection(pb, row)
        if (!res.ok) failed += 1
      } catch {
        failed += 1
      }
    }
    return { processed: due.length, failed }
  } finally {
    await releaseFacebookSyncLock(pb, owner)
    releaseInProcessFacebookSyncLock(owner)
  }
}
