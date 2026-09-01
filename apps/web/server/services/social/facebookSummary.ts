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
import {
  listSocialPostsForConnection,
  publicSocialPost,
  sortSocialPosts,
  type PublicSocialPost,
} from '~/server/services/social/socialPosts'
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

export function latestDailyPoints(
  rows: SnapshotRow[],
  metricKey: string,
  range: DateRange,
): Array<{ date: string; value: number }> {
  const byDate = new Map<string, { date: string; value: number; collectedAt: string }>()
  for (const r of rows) {
    if (r.metric_key !== metricKey) continue
    if (r.value == null || !Number.isFinite(r.value)) continue
    const date = (r.period_end || r.snapshot_date || '').slice(0, 10)
    if (!date || date < range.start || date > range.end) continue
    const prev = byDate.get(date)
    if (!prev || r.collected_at >= prev.collectedAt) {
      byDate.set(date, { date, value: r.value, collectedAt: r.collected_at })
    }
  }
  return [...byDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ date, value }) => ({ date, value }))
}

export function sumDailyMetricSnapshots(
  rows: SnapshotRow[],
  metricKey: string,
  range: DateRange,
): { value: number | null; periodStart?: string; periodEnd?: string; days: number } {
  const points = latestDailyPoints(rows, metricKey, range)
  if (!points.length) return { value: null, days: 0 }
  return {
    value: points.reduce((sum, p) => sum + p.value, 0),
    periodStart: points[0].date,
    periodEnd: points[points.length - 1].date,
    days: points.length,
  }
}

function viewFromDailySum(
  key: string,
  label: string,
  aggregation: MetricAggregation,
  summed: { value: number | null; periodStart?: string; periodEnd?: string; days: number },
  unsupportedReason?: string,
): ReportMetricView {
  if (summed.days === 0 || summed.value == null || !Number.isFinite(summed.value)) {
    return emptyView(key, label, aggregation, unsupportedReason)
  }
  const periodStart = summed.periodStart || ''
  const periodEnd = summed.periodEnd || ''
  return {
    key,
    label,
    value: summed.value,
    available: true,
    isExact: true,
    source: 'meta_graph',
    aggregation,
    periodType: 'day',
    periodStart,
    periodEnd,
    periodLabel: formatPeriodCaption({ aggregation, periodStart, periodEnd }),
  }
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
    return 'Post engagements are stored as daily totals when available. No daily snapshots match this report range yet.'
  }
  if (metricKey === FACEBOOK_PAGE_METRICS.postsPublished.key) {
    return 'No posts are stored for this report range yet.'
  }
  return 'No snapshot matches this report period.'
}

function emptyMetrics(reason?: string) {
  const connect = reason || 'Connect Meta for Page Insights.'
  return {
    followers: emptyView(
      FACEBOOK_PAGE_METRICS.followers.key,
      FACEBOOK_PAGE_METRICS.followers.label,
      FACEBOOK_PAGE_METRICS.followers.aggregation,
      reason || 'Track a Facebook Page to include social performance.',
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
      connect,
    ),
    engagement: emptyView(
      FACEBOOK_PAGE_METRICS.engagement.key,
      FACEBOOK_PAGE_METRICS.engagement.label,
      FACEBOOK_PAGE_METRICS.engagement.aggregation,
      connect,
    ),
    postsPublished: emptyView(
      FACEBOOK_PAGE_METRICS.postsPublished.key,
      FACEBOOK_PAGE_METRICS.postsPublished.label,
      FACEBOOK_PAGE_METRICS.postsPublished.aggregation,
      connect,
    ),
    dailyFollows: emptyView(
      FACEBOOK_PAGE_METRICS.dailyFollows.key,
      FACEBOOK_PAGE_METRICS.dailyFollows.label,
      FACEBOOK_PAGE_METRICS.dailyFollows.aggregation,
      connect,
    ),
    dailyUnfollows: emptyView(
      FACEBOOK_PAGE_METRICS.dailyUnfollows.key,
      FACEBOOK_PAGE_METRICS.dailyUnfollows.label,
      FACEBOOK_PAGE_METRICS.dailyUnfollows.aggregation,
      connect,
    ),
    pageViews: emptyView(
      FACEBOOK_PAGE_METRICS.pageViews.key,
      FACEBOOK_PAGE_METRICS.pageViews.label,
      FACEBOOK_PAGE_METRICS.pageViews.aggregation,
      connect,
    ),
    pageActions: emptyView(
      FACEBOOK_PAGE_METRICS.pageActions.key,
      FACEBOOK_PAGE_METRICS.pageActions.label,
      FACEBOOK_PAGE_METRICS.pageActions.aggregation,
      connect,
    ),
    mediaViews: emptyView(
      FACEBOOK_PAGE_METRICS.mediaViews.key,
      FACEBOOK_PAGE_METRICS.mediaViews.label,
      FACEBOOK_PAGE_METRICS.mediaViews.aggregation,
      connect,
    ),
  }
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
      metrics: emptyMetrics('Track a Facebook Page to include social performance.'),
      followerTrend: [] as Array<{ date: string; value: number }>,
      engagementTrend: [] as Array<{ date: string; value: number }>,
      followsTrend: [] as Array<{ date: string; value: number }>,
      unfollowsTrend: [] as Array<{ date: string; value: number }>,
      posts: [] as PublicSocialPost[],
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
  const engagementWindowRow = capabilities.engagement
    ? latestFittingPeriodSnapshot(snapshots, FACEBOOK_PAGE_METRICS.engagement.key, opts.range)
    : null
  const postsWindowRow = capabilities.posts
    ? latestFittingPeriodSnapshot(snapshots, FACEBOOK_PAGE_METRICS.postsPublished.key, opts.range)
    : null

  const reachReason =
    reachUnsupported ||
    (capabilities.reach && !reachRow ? periodMismatchReason(FACEBOOK_PAGE_METRICS.reach.key) : undefined)

  const engagementDaily = capabilities.engagement
    ? sumDailyMetricSnapshots(snapshots, FACEBOOK_PAGE_METRICS.engagementDay.key, opts.range)
    : { value: null, days: 0 }
  const engagementView =
    engagementDaily.days > 0
      ? viewFromDailySum(
          FACEBOOK_PAGE_METRICS.engagement.key,
          FACEBOOK_PAGE_METRICS.engagement.label,
          FACEBOOK_PAGE_METRICS.engagement.aggregation,
          engagementDaily,
        )
      : viewFromSnapshot(
          FACEBOOK_PAGE_METRICS.engagement.key,
          FACEBOOK_PAGE_METRICS.engagement.label,
          FACEBOOK_PAGE_METRICS.engagement.aggregation,
          engagementWindowRow,
          engagementUnsupported ||
            (capabilities.engagement ? periodMismatchReason(FACEBOOK_PAGE_METRICS.engagement.key) : undefined),
        )

  let posts: PublicSocialPost[] = []
  let postsView: ReportMetricView
  if (!capabilities.posts) {
    postsView = emptyView(
      FACEBOOK_PAGE_METRICS.postsPublished.key,
      FACEBOOK_PAGE_METRICS.postsPublished.label,
      FACEBOOK_PAGE_METRICS.postsPublished.aggregation,
      postsUnsupported,
    )
  } else {
    try {
      const rows = await listSocialPostsForConnection(pb, connection.id, {
        since: opts.range.start,
        until: opts.range.end,
      })
      posts = sortSocialPosts(rows, 'reach').slice(0, 25).map(publicSocialPost)
      postsView = {
        key: FACEBOOK_PAGE_METRICS.postsPublished.key,
        label: FACEBOOK_PAGE_METRICS.postsPublished.label,
        value: rows.length,
        available: true,
        isExact: true,
        source: 'meta_graph',
        aggregation: FACEBOOK_PAGE_METRICS.postsPublished.aggregation,
        periodType: 'range',
        periodStart: opts.range.start,
        periodEnd: opts.range.end,
        periodLabel: formatPeriodCaption({
          aggregation: FACEBOOK_PAGE_METRICS.postsPublished.aggregation,
          periodStart: opts.range.start,
          periodEnd: opts.range.end,
        }),
      }
    } catch {
      postsView = viewFromSnapshot(
        FACEBOOK_PAGE_METRICS.postsPublished.key,
        FACEBOOK_PAGE_METRICS.postsPublished.label,
        FACEBOOK_PAGE_METRICS.postsPublished.aggregation,
        postsWindowRow,
        postsWindowRow ? undefined : periodMismatchReason(FACEBOOK_PAGE_METRICS.postsPublished.key),
      )
    }
  }

  const dailyFollows = viewFromDailySum(
    FACEBOOK_PAGE_METRICS.dailyFollows.key,
    FACEBOOK_PAGE_METRICS.dailyFollows.label,
    FACEBOOK_PAGE_METRICS.dailyFollows.aggregation,
    capabilities.engagement
      ? sumDailyMetricSnapshots(snapshots, FACEBOOK_PAGE_METRICS.dailyFollows.key, opts.range)
      : { value: null, days: 0 },
    engagementUnsupported,
  )
  const dailyUnfollows = viewFromDailySum(
    FACEBOOK_PAGE_METRICS.dailyUnfollows.key,
    FACEBOOK_PAGE_METRICS.dailyUnfollows.label,
    FACEBOOK_PAGE_METRICS.dailyUnfollows.aggregation,
    capabilities.engagement
      ? sumDailyMetricSnapshots(snapshots, FACEBOOK_PAGE_METRICS.dailyUnfollows.key, opts.range)
      : { value: null, days: 0 },
    engagementUnsupported,
  )

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
      engagement: engagementView,
      postsPublished: postsView,
      dailyFollows,
      dailyUnfollows,
      pageViews: viewFromDailySum(
        FACEBOOK_PAGE_METRICS.pageViews.key,
        FACEBOOK_PAGE_METRICS.pageViews.label,
        FACEBOOK_PAGE_METRICS.pageViews.aggregation,
        capabilities.engagement
          ? sumDailyMetricSnapshots(snapshots, FACEBOOK_PAGE_METRICS.pageViews.key, opts.range)
          : { value: null, days: 0 },
        engagementUnsupported,
      ),
      pageActions: viewFromDailySum(
        FACEBOOK_PAGE_METRICS.pageActions.key,
        FACEBOOK_PAGE_METRICS.pageActions.label,
        FACEBOOK_PAGE_METRICS.pageActions.aggregation,
        capabilities.engagement
          ? sumDailyMetricSnapshots(snapshots, FACEBOOK_PAGE_METRICS.pageActions.key, opts.range)
          : { value: null, days: 0 },
        engagementUnsupported,
      ),
      mediaViews: viewFromDailySum(
        FACEBOOK_PAGE_METRICS.mediaViews.key,
        FACEBOOK_PAGE_METRICS.mediaViews.label,
        FACEBOOK_PAGE_METRICS.mediaViews.aggregation,
        capabilities.engagement
          ? sumDailyMetricSnapshots(snapshots, FACEBOOK_PAGE_METRICS.mediaViews.key, opts.range)
          : { value: null, days: 0 },
        engagementUnsupported,
      ),
    },
    followerTrend: followerTrendFromSnapshots(followerHistory),
    engagementTrend: latestDailyPoints(snapshots, FACEBOOK_PAGE_METRICS.engagementDay.key, opts.range),
    followsTrend: latestDailyPoints(snapshots, FACEBOOK_PAGE_METRICS.dailyFollows.key, opts.range),
    unfollowsTrend: latestDailyPoints(snapshots, FACEBOOK_PAGE_METRICS.dailyUnfollows.key, opts.range),
    posts,
    agencyIntegrationId: extractPocketBaseRelationId(connection.agency_integration),
  }
}
