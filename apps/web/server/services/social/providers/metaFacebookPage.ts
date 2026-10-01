import { metaGraphFetch, walkGraphPages, type GraphPage } from '~/server/utils/metaClient'
import {
  FACEBOOK_PAGE_METRICS,
  FACEBOOK_POST_INSIGHT_METRIC_NAMES,
} from '~/server/services/social/metrics/registry'
import { aggregateInsightValues } from '~/server/services/social/metrics/aggregateInsights'
import { normalizedMetric } from '~/server/services/social/metrics/normalize'
import {
  insightRowByName,
  parsePostInsightRows,
  reactionsForPost,
} from '~/server/services/social/metrics/postInsights'
import { isSocialServiceError } from '~/server/services/social/errors'
import type { DateRange, NormalizedSocialMetric, NormalizedSocialPost } from '~/server/services/social/types'

export type MetaPage = {
  id: string
  name: string
  username?: string
  link?: string
  followersCount?: number | null
}

export function mapManagedPage(p: {
  id: string
  name: string
  username?: string
  link?: string
  followers_count?: number
  fan_count?: number
}): MetaPage {
  const followers =
    typeof p.followers_count === 'number'
      ? p.followers_count
      : typeof p.fan_count === 'number'
        ? p.fan_count
        : null
  return {
    id: p.id,
    name: p.name,
    username: p.username,
    link: p.link,
    followersCount: followers,
  }
}

type InsightRow = { name?: string; period?: string; values?: Array<{ value?: unknown; end_time?: string }> }

async function fetchInsightGroup(opts: {
  pageId: string
  pageAccessToken: string
  metrics: string[]
  period: string
  since?: string
  until?: string
  group: string
}): Promise<InsightRow[]> {
  try {
    const json = await metaGraphFetch<{ data?: InsightRow[] }>({
      path: `${opts.pageId}/insights`,
      accessToken: opts.pageAccessToken,
      query: {
        metric: opts.metrics.join(','),
        period: opts.period,
        since: opts.since,
        until: opts.until,
      },
    })
    return json.data || []
  } catch (e) {
    console.warn('[social.facebook.insights_group_failed]', {
      group: opts.group,
      pageId: opts.pageId,
      metrics: opts.metrics,
      code: isSocialServiceError(e) ? e.code : 'unknown',
    })
    return []
  }
}

function pushLatest(
  out: NormalizedSocialMetric[],
  spec: {
    key: string
    metaMetric: string
    insightsPeriod: 'day' | 'days_28'
    periodType: string
    aggregation: 'point_in_time' | 'sum' | 'non_additive' | 'period_value' | 'derived'
  },
  rows: InsightRow[],
  collectedAt: string,
  fallbackStart: string,
  fallbackEnd: string,
  range?: DateRange,
) {
  const aggregated = aggregateInsightValues(insightRowByName(rows, spec.metaMetric)?.values, {
    aggregation: spec.aggregation,
    seriesPeriod: spec.insightsPeriod,
    range,
  })
  out.push(
    normalizedMetric({
      key: spec.key,
      raw: aggregated.value,
      source: 'meta_graph',
      collectedAt,
      periodType: spec.periodType,
      periodStart: aggregated.periodStart || fallbackStart,
      periodEnd: aggregated.periodEnd || fallbackEnd,
      isExact: true,
    }),
  )
}

function pushDailySeries(
  out: NormalizedSocialMetric[],
  spec: { key: string; metaMetric: string; periodType: string },
  rows: InsightRow[],
  collectedAt: string,
  range: DateRange,
) {
  const values = insightRowByName(rows, spec.metaMetric)?.values || []
  for (const point of values) {
    const day = (point.end_time || '').slice(0, 10)
    if (!day) continue
    if (day < range.start || day > range.end) continue
    if (typeof point.value === 'object' && point.value != null) continue
    out.push(
      normalizedMetric({
        key: spec.key,
        raw: point.value,
        source: 'meta_graph',
        collectedAt,
        periodType: spec.periodType,
        periodStart: day,
        periodEnd: day,
        isExact: true,
      }),
    )
  }
}

export async function fetchPageMetrics(opts: {
  pageId: string
  pageAccessToken: string
  range: DateRange
  collectedAt: string
}): Promise<NormalizedSocialMetric[]> {
  const out: NormalizedSocialMetric[] = []
  const observationDate = opts.collectedAt.slice(0, 10)

  const page = await metaGraphFetch<{ id: string; followers_count?: number; fan_count?: number }>({
    path: opts.pageId,
    accessToken: opts.pageAccessToken,
    query: { fields: 'id,followers_count,fan_count' },
  })
  const followersRaw = page.followers_count ?? page.fan_count
  out.push(
    normalizedMetric({
      key: FACEBOOK_PAGE_METRICS.followers.key,
      raw: followersRaw ?? null,
      source: 'meta_graph',
      collectedAt: opts.collectedAt,
      periodType: FACEBOOK_PAGE_METRICS.followers.periodType,
      periodStart: observationDate,
      periodEnd: observationDate,
      isExact: true,
    }),
  )

  const followsRows = await fetchInsightGroup({
    pageId: opts.pageId,
    pageAccessToken: opts.pageAccessToken,
    metrics: [FACEBOOK_PAGE_METRICS.follows.metaMetric],
    period: FACEBOOK_PAGE_METRICS.follows.insightsPeriod,
    since: opts.range.start,
    until: opts.range.end,
    group: 'follows',
  })
  pushLatest(
    out,
    FACEBOOK_PAGE_METRICS.follows,
    followsRows,
    opts.collectedAt,
    observationDate,
    observationDate,
    opts.range,
  )

  const reachRows = await fetchInsightGroup({
    pageId: opts.pageId,
    pageAccessToken: opts.pageAccessToken,
    metrics: [FACEBOOK_PAGE_METRICS.reach.metaMetric],
    period: FACEBOOK_PAGE_METRICS.reach.insightsPeriod,
    until: opts.range.end,
    group: 'reach_28',
  })
  pushLatest(out, FACEBOOK_PAGE_METRICS.reach, reachRows, opts.collectedAt, opts.range.start, opts.range.end)

  const engagement28Rows = await fetchInsightGroup({
    pageId: opts.pageId,
    pageAccessToken: opts.pageAccessToken,
    metrics: [FACEBOOK_PAGE_METRICS.engagement.metaMetric],
    period: FACEBOOK_PAGE_METRICS.engagement.insightsPeriod,
    until: opts.range.end,
    group: 'engagement_28',
  })
  pushLatest(
    out,
    FACEBOOK_PAGE_METRICS.engagement,
    engagement28Rows,
    opts.collectedAt,
    opts.range.start,
    opts.range.end,
  )

  const engagementDayRows = await fetchInsightGroup({
    pageId: opts.pageId,
    pageAccessToken: opts.pageAccessToken,
    metrics: [FACEBOOK_PAGE_METRICS.engagementDay.metaMetric],
    period: FACEBOOK_PAGE_METRICS.engagementDay.insightsPeriod,
    since: opts.range.start,
    until: opts.range.end,
    group: 'engagement_day',
  })
  pushDailySeries(out, FACEBOOK_PAGE_METRICS.engagementDay, engagementDayRows, opts.collectedAt, opts.range)

  const followDeltaRows = await fetchInsightGroup({
    pageId: opts.pageId,
    pageAccessToken: opts.pageAccessToken,
    metrics: [FACEBOOK_PAGE_METRICS.dailyFollows.metaMetric],
    period: FACEBOOK_PAGE_METRICS.dailyFollows.insightsPeriod,
    since: opts.range.start,
    until: opts.range.end,
    group: 'daily_follows',
  })
  pushDailySeries(out, FACEBOOK_PAGE_METRICS.dailyFollows, followDeltaRows, opts.collectedAt, opts.range)

  const unfollowRows = await fetchInsightGroup({
    pageId: opts.pageId,
    pageAccessToken: opts.pageAccessToken,
    metrics: [FACEBOOK_PAGE_METRICS.dailyUnfollows.metaMetric],
    period: FACEBOOK_PAGE_METRICS.dailyUnfollows.insightsPeriod,
    since: opts.range.start,
    until: opts.range.end,
    group: 'daily_unfollows',
  })
  pushDailySeries(out, FACEBOOK_PAGE_METRICS.dailyUnfollows, unfollowRows, opts.collectedAt, opts.range)

  // Fetch activity metrics one-at-a-time: Meta rejects the whole insights request if any name is unsupported.
  for (const spec of [
    FACEBOOK_PAGE_METRICS.pageViews,
    FACEBOOK_PAGE_METRICS.pageActions,
    FACEBOOK_PAGE_METRICS.mediaViews,
  ] as const) {
    const rows = await fetchInsightGroup({
      pageId: opts.pageId,
      pageAccessToken: opts.pageAccessToken,
      metrics: [spec.metaMetric],
      period: spec.insightsPeriod,
      since: opts.range.start,
      until: opts.range.end,
      group: spec.key,
    })
    pushDailySeries(out, spec, rows, opts.collectedAt, opts.range)
  }

  return out
}

type GraphPost = {
  id: string
  message?: string
  created_time?: string
  permalink_url?: string
  full_picture?: string
  status_type?: string
  attachments?: { data?: Array<{ media_type?: string; type?: string }> }
  insights?: { data?: InsightRow[] }
}

function mapGraphPost(p: GraphPost): NormalizedSocialPost {
  const parsed = parsePostInsightRows(p.insights?.data)
  const mediaType =
    p.attachments?.data?.[0]?.media_type || p.attachments?.data?.[0]?.type || p.status_type || undefined
  return {
    externalId: p.id,
    publishedAt: p.created_time || '',
    permalink: p.permalink_url,
    message: p.message,
    mediaUrl: p.full_picture,
    mediaType,
    reach: parsed.reach,
    views: parsed.views,
    clicks: parsed.clicks,
    engagement: {
      reactions: reactionsForPost(parsed),
      comments: parsed.comments,
      shares: parsed.shares,
    },
    reactionsByType: parsed.reactionsByType,
  }
}

export async function fetchRecentPosts(opts: {
  pageId: string
  pageAccessToken: string
  range: DateRange
  limit?: number
}): Promise<{ posts: NormalizedSocialPost[]; publishedCount: number }> {
  const maxItems = opts.limit ?? 500
  const insightFields = FACEBOOK_POST_INSIGHT_METRIC_NAMES.join(',')
  const baseFields = 'id,message,created_time,permalink_url,full_picture,status_type,attachments{media_type,type}'
  const walk = (fields: string) =>
    walkGraphPages<GraphPost>({
      fetchPage: (path, query) =>
        metaGraphFetch<GraphPage<GraphPost>>({
          path,
          accessToken: opts.pageAccessToken,
          query,
        }),
      firstPath: `${opts.pageId}/posts`,
      firstQuery: {
        fields,
        since: opts.range.start,
        until: opts.range.end,
        limit: '100',
      },
      maxItems,
    })

  let rows: GraphPost[]
  try {
    rows = await walk(`${baseFields},insights.metric(${insightFields})`)
  } catch (e) {
    console.warn('[social.facebook.posts_insights_expansion_failed]', {
      pageId: opts.pageId,
      code: isSocialServiceError(e) ? e.code : 'unknown',
    })
    rows = await walk(baseFields)
  }

  const posts = rows.map(mapGraphPost)
  return { posts, publishedCount: posts.length }
}
