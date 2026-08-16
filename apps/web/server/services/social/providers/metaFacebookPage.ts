import { metaGraphFetch, walkGraphPages } from '~/server/utils/metaClient'
import { FACEBOOK_PAGE_METRICS } from '~/server/services/social/metrics/registry'
import { aggregateInsightValues } from '~/server/services/social/metrics/aggregateInsights'
import { normalizedMetric } from '~/server/services/social/metrics/normalize'
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

function insightByName(rows: InsightRow[] | undefined, name: string): InsightRow | undefined {
  return (rows || []).find((row) => row.name === name)
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

  const followsInsights = await metaGraphFetch<{ data?: InsightRow[] }>({
    path: `${opts.pageId}/insights`,
    accessToken: opts.pageAccessToken,
    query: {
      metric: FACEBOOK_PAGE_METRICS.follows.metaMetric,
      period: FACEBOOK_PAGE_METRICS.follows.insightsPeriod,
      since: opts.range.start,
      until: opts.range.end,
    },
  })
  const follows = aggregateInsightValues(insightByName(followsInsights.data, FACEBOOK_PAGE_METRICS.follows.metaMetric)?.values, {
    aggregation: FACEBOOK_PAGE_METRICS.follows.aggregation,
    seriesPeriod: FACEBOOK_PAGE_METRICS.follows.insightsPeriod,
    range: opts.range,
  })
  out.push(
    normalizedMetric({
      key: FACEBOOK_PAGE_METRICS.follows.key,
      raw: follows.value,
      source: 'meta_graph',
      collectedAt: opts.collectedAt,
      periodType: FACEBOOK_PAGE_METRICS.follows.periodType,
      periodStart: follows.periodEnd || observationDate,
      periodEnd: follows.periodEnd || observationDate,
      isExact: true,
    }),
  )

  const periodInsights = await metaGraphFetch<{ data?: InsightRow[] }>({
    path: `${opts.pageId}/insights`,
    accessToken: opts.pageAccessToken,
    query: {
      metric: [FACEBOOK_PAGE_METRICS.reach.metaMetric, FACEBOOK_PAGE_METRICS.engagement.metaMetric].join(','),
      period: FACEBOOK_PAGE_METRICS.reach.insightsPeriod,
      until: opts.range.end,
    },
  })

  const reach = aggregateInsightValues(insightByName(periodInsights.data, FACEBOOK_PAGE_METRICS.reach.metaMetric)?.values, {
    aggregation: FACEBOOK_PAGE_METRICS.reach.aggregation,
    seriesPeriod: FACEBOOK_PAGE_METRICS.reach.insightsPeriod,
  })
  out.push(
    normalizedMetric({
      key: FACEBOOK_PAGE_METRICS.reach.key,
      raw: reach.value,
      source: 'meta_graph',
      collectedAt: opts.collectedAt,
      periodType: FACEBOOK_PAGE_METRICS.reach.periodType,
      periodStart: reach.periodStart || opts.range.start,
      periodEnd: reach.periodEnd || opts.range.end,
      isExact: true,
    }),
  )

  const engagement = aggregateInsightValues(
    insightByName(periodInsights.data, FACEBOOK_PAGE_METRICS.engagement.metaMetric)?.values,
    {
      aggregation: FACEBOOK_PAGE_METRICS.engagement.aggregation,
      seriesPeriod: FACEBOOK_PAGE_METRICS.engagement.insightsPeriod,
    },
  )
  out.push(
    normalizedMetric({
      key: FACEBOOK_PAGE_METRICS.engagement.key,
      raw: engagement.value,
      source: 'meta_graph',
      collectedAt: opts.collectedAt,
      periodType: FACEBOOK_PAGE_METRICS.engagement.periodType,
      periodStart: engagement.periodStart || opts.range.start,
      periodEnd: engagement.periodEnd || opts.range.end,
      isExact: true,
    }),
  )

  return out
}

export async function fetchRecentPosts(opts: {
  pageId: string
  pageAccessToken: string
  range: DateRange
  limit?: number
}): Promise<{ posts: NormalizedSocialPost[]; publishedCount: number }> {
  const maxItems = opts.limit ?? 500
  const rows = await walkGraphPages<{
    id: string
    message?: string
    created_time?: string
    permalink_url?: string
  }>({
    fetchPage: (path, query) =>
      metaGraphFetch({
        path,
        accessToken: opts.pageAccessToken,
        query,
      }),
    firstPath: `${opts.pageId}/posts`,
    firstQuery: {
      fields: 'id,message,created_time,permalink_url',
      since: opts.range.start,
      until: opts.range.end,
      limit: '100',
    },
    maxItems,
  })

  const posts: NormalizedSocialPost[] = rows.map((p) => ({
    externalId: p.id,
    publishedAt: p.created_time || '',
    permalink: p.permalink_url,
    message: p.message,
  }))
  return { posts, publishedCount: posts.length }
}
