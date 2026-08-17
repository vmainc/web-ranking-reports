import type PocketBase from 'pocketbase'
import {
  FACEBOOK_DERIVED_METRICS,
  FACEBOOK_PAGE_METRICS,
  type MetricAggregation,
} from '~/server/services/social/metrics/registry'
import { followerGrowth } from '~/server/services/social/metrics/derived'
import { formatPeriodCaption, periodFitsReportRange } from '~/server/services/social/metrics/aggregateInsights'
import {
  listSnapshotsForConnection,
  snapshotOnOrBefore,
  type SnapshotRow,
} from '~/server/services/social/snapshots'
import { findFacebookPageConnection, publicSocialConnection } from '~/server/services/social/socialConnections'
import { capabilitiesForAccessType, isPublicFacebookProviderAvailable } from '~/server/services/social/capabilities'
import { publicMetricsUnavailableReason } from '~/server/services/social/providers/facebookPublic'
import type { DateRange, SocialCapabilities } from '~/server/services/social/types'
import { getAgencyIntegration, publicAgencyIntegration } from '~/server/services/social/agencyMetaIntegration'
import { extractPocketBaseRelationId } from '~/server/utils/workspace'

export type ReportMetricView = {
  key: string
  label: string
  value: number | null
  available: boolean
  isExact: boolean
  source: string
  aggregation: MetricAggregation
  periodType?: string
  periodStart?: string
  periodEnd?: string
  periodLabel?: string
  asOf?: string
  unsupportedReason?: string
}

function emptyView(
  key: string,
  label: string,
  aggregation: MetricAggregation,
  unsupportedReason?: string,
): ReportMetricView {
  return {
    key,
    label,
    value: null,
    available: false,
    isExact: true,
    source: '',
    aggregation,
    unsupportedReason,
  }
}

function viewFromSnapshot(
  key: string,
  label: string,
  aggregation: MetricAggregation,
  row: SnapshotRow | null,
  unsupportedReason?: string,
): ReportMetricView {
  if (!row || row.value == null || !Number.isFinite(row.value)) {
    return emptyView(key, label, aggregation, unsupportedReason)
  }
  const periodStart = row.period_start || ''
  const periodEnd = row.period_end || ''
  return {
    key,
    label,
    value: row.value,
    available: true,
    isExact: row.is_exact !== false,
    source: row.source || '',
    aggregation,
    periodType: row.period_type,
    periodStart,
    periodEnd,
    periodLabel: formatPeriodCaption({ aggregation, periodStart, periodEnd }),
    asOf: aggregation === 'point_in_time' ? periodEnd || row.snapshot_date : undefined,
  }
}

export function followerTrendFromSnapshots(rows: SnapshotRow[]): Array<{ date: string; value: number }> {
  const byDate = new Map<string, SnapshotRow>()
  for (const r of rows) {
    if (r.metric_key !== FACEBOOK_PAGE_METRICS.followers.key) continue
    if (r.value == null || !Number.isFinite(r.value)) continue
    const date = r.snapshot_date || r.period_end
    if (!date) continue
    const prev = byDate.get(date)
    if (!prev || r.collected_at >= prev.collected_at) byDate.set(date, r)
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, r]) => ({ date, value: r.value }))
}

function latestFittingPeriodSnapshot(rows: SnapshotRow[], metricKey: string, range: DateRange): SnapshotRow | null {
  const matches = rows.filter((r) => r.metric_key === metricKey && periodFitsReportRange(r, range))
  if (!matches.length) return null
  return matches.reduce((a, b) => (a.snapshot_date >= b.snapshot_date ? a : b))
}

function periodMismatchReason(metricKey: string): string {
  if (metricKey === FACEBOOK_PAGE_METRICS.reach.key) {
    return 'Unique media viewers are stored as Meta’s 28-day unique count, not summed daily uniques. This report range does not match that period.'
  }
  if (metricKey === FACEBOOK_PAGE_METRICS.engagement.key) {
    return 'Post engagements are stored as Meta’s 28-day total. This report range does not match that period.'
  }
  if (metricKey === FACEBOOK_PAGE_METRICS.postsPublished.key) {
    return 'Posts published are stored for the last 28-day collection window. This report range does not match that period.'
  }
  return 'No snapshot matches this report period.'
}

export async function getFacebookSocialSummary(
  pb: PocketBase,
  opts: { siteId: string; agencyOwnerId: string; range: DateRange },
) {
  const connection = await findFacebookPageConnection(pb, opts.siteId)
  const meta = publicAgencyIntegration(await getAgencyIntegration(pb, opts.agencyOwnerId, 'meta'))
  const capabilities: SocialCapabilities = capabilitiesForAccessType(
    connection?.access_type,
    connection?.status,
  )

  if (!connection) {
    return {
      connection: null,
      capabilities: capabilitiesForAccessType(null),
      meta,
      publicProviderAvailable: isPublicFacebookProviderAvailable(),
      publicMetricsUnavailableReason: publicMetricsUnavailableReason(),
      metrics: {
        followers: emptyView(
          FACEBOOK_PAGE_METRICS.followers.key,
          FACEBOOK_PAGE_METRICS.followers.label,
          FACEBOOK_PAGE_METRICS.followers.aggregation,
          'Track a Facebook Page to include social performance.',
        ),
        followerGrowth: emptyView(
          FACEBOOK_DERIVED_METRICS.followerGrowth.key,
          FACEBOOK_DERIVED_METRICS.followerGrowth.label,
          FACEBOOK_DERIVED_METRICS.followerGrowth.aggregation,
        ),
        reach: emptyView(
          FACEBOOK_PAGE_METRICS.reach.key,
          FACEBOOK_PAGE_METRICS.reach.label,
          FACEBOOK_PAGE_METRICS.reach.aggregation,
          'Connect Meta for Page Insights.',
        ),
        engagement: emptyView(
          FACEBOOK_PAGE_METRICS.engagement.key,
          FACEBOOK_PAGE_METRICS.engagement.label,
          FACEBOOK_PAGE_METRICS.engagement.aggregation,
          'Connect Meta for Page Insights.',
        ),
        postsPublished: emptyView(
          FACEBOOK_PAGE_METRICS.postsPublished.key,
          FACEBOOK_PAGE_METRICS.postsPublished.label,
          FACEBOOK_PAGE_METRICS.postsPublished.aggregation,
          'Connect Meta for Page Insights.',
        ),
      },
      followerTrend: [] as Array<{ date: string; value: number }>,
    }
  }

  const snapshots = await listSnapshotsForConnection(pb, connection.id)
  const followerHistory = snapshots.filter((r) => r.metric_key === FACEBOOK_PAGE_METRICS.followers.key)

  const followersNow = snapshotOnOrBefore(followerHistory, FACEBOOK_PAGE_METRICS.followers.key, opts.range.end)
  const followersBegin = snapshotOnOrBefore(followerHistory, FACEBOOK_PAGE_METRICS.followers.key, opts.range.start)
  const growth = followerGrowth({
    beginningFollowers: followersBegin?.value,
    endingFollowers: followersNow?.value,
  })

  const publicUnavailable =
    connection.access_type === 'public' &&
    !isPublicFacebookProviderAvailable() &&
    (followersNow == null || followersNow.value == null)

  const reachUnsupported = capabilities.reach
    ? undefined
    : 'Reach is unavailable with this access level. Connect Meta for Page Insights.'
  const engagementUnsupported = capabilities.engagement
    ? undefined
    : 'Engagement is unavailable with this access level. Connect Meta for Page Insights.'
  const postsUnsupported = capabilities.posts
    ? undefined
    : 'Post activity is unavailable with this access level. Connect Meta for Page Insights.'

  const reachRow = capabilities.reach
    ? latestFittingPeriodSnapshot(snapshots, FACEBOOK_PAGE_METRICS.reach.key, opts.range)
    : null
  const engagementRow = capabilities.engagement
    ? latestFittingPeriodSnapshot(snapshots, FACEBOOK_PAGE_METRICS.engagement.key, opts.range)
    : null
  const postsRow = capabilities.posts
    ? latestFittingPeriodSnapshot(snapshots, FACEBOOK_PAGE_METRICS.postsPublished.key, opts.range)
    : null

  const reachReason =
    reachUnsupported ||
    (capabilities.reach && !reachRow ? periodMismatchReason(FACEBOOK_PAGE_METRICS.reach.key) : undefined)
  const engagementReason =
    engagementUnsupported ||
    (capabilities.engagement && !engagementRow
      ? periodMismatchReason(FACEBOOK_PAGE_METRICS.engagement.key)
      : undefined)
  const postsReason =
    postsUnsupported ||
    (capabilities.posts && !postsRow ? periodMismatchReason(FACEBOOK_PAGE_METRICS.postsPublished.key) : undefined)

  const growthView: ReportMetricView = {
    key: FACEBOOK_DERIVED_METRICS.followerGrowth.key,
    label: FACEBOOK_DERIVED_METRICS.followerGrowth.label,
    value: growth,
    available: growth != null,
    isExact: true,
    source: 'derived',
    aggregation: FACEBOOK_DERIVED_METRICS.followerGrowth.aggregation,
    periodStart: opts.range.start,
    periodEnd: opts.range.end,
    periodLabel: formatPeriodCaption({
      aggregation: FACEBOOK_DERIVED_METRICS.followerGrowth.aggregation,
      periodStart: opts.range.start,
      periodEnd: opts.range.end,
    }),
  }

  return {
    connection: publicSocialConnection(connection),
    capabilities,
    meta,
    publicProviderAvailable: isPublicFacebookProviderAvailable(),
    publicMetricsUnavailableReason: publicUnavailable ? publicMetricsUnavailableReason() : '',
    metrics: {
      followers: viewFromSnapshot(
        FACEBOOK_PAGE_METRICS.followers.key,
        FACEBOOK_PAGE_METRICS.followers.label,
        FACEBOOK_PAGE_METRICS.followers.aggregation,
        followersNow,
        publicUnavailable ? publicMetricsUnavailableReason() : undefined,
      ),
      followerGrowth: growthView,
      reach: viewFromSnapshot(
        FACEBOOK_PAGE_METRICS.reach.key,
        FACEBOOK_PAGE_METRICS.reach.label,
        FACEBOOK_PAGE_METRICS.reach.aggregation,
        reachRow,
        reachReason,
      ),
      engagement: viewFromSnapshot(
        FACEBOOK_PAGE_METRICS.engagement.key,
        FACEBOOK_PAGE_METRICS.engagement.label,
        FACEBOOK_PAGE_METRICS.engagement.aggregation,
        engagementRow,
        engagementReason,
      ),
      postsPublished: viewFromSnapshot(
        FACEBOOK_PAGE_METRICS.postsPublished.key,
        FACEBOOK_PAGE_METRICS.postsPublished.label,
        FACEBOOK_PAGE_METRICS.postsPublished.aggregation,
        postsRow,
        postsReason,
      ),
      },
      followerTrend: followerTrendFromSnapshots(followerHistory),
      agencyIntegrationId: extractPocketBaseRelationId(connection.agency_integration),
    }
}
