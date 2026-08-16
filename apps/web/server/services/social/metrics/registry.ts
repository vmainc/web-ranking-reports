import type { SocialAccessType } from '~/server/services/social/types'

export const METRIC_AGGREGATION = {
  point_in_time: 'point_in_time',
  sum: 'sum',
  period_value: 'period_value',
  non_additive: 'non_additive',
  derived: 'derived',
} as const

export type MetricAggregation = (typeof METRIC_AGGREGATION)[keyof typeof METRIC_AGGREGATION]

export const META_INSIGHTS_PERIOD = {
  day: 'day',
  days_28: 'days_28',
} as const

export type MetaInsightsPeriod = (typeof META_INSIGHTS_PERIOD)[keyof typeof META_INSIGHTS_PERIOD]

/**
 * WRR-normalized Facebook Page metric keys.
 * Meta Graph field names live only in `metaMetric` / `metaField` and must be updated when Meta deprecates Insights.
 *
 * Graph API v25+ (June 2026): do not request page_impressions_unique / other deprecated reach metrics.
 * Unique reach uses page_total_media_view_unique with Meta’s `days_28` period — never summed across days.
 */
export const FACEBOOK_PAGE_METRICS = {
  followers: {
    key: 'facebook.page.followers',
    label: 'Followers',
    sourceType: 'page' as const,
    supportedAccess: ['public', 'authenticated'] as SocialAccessType[],
    metaField: 'followers_count',
    periodType: 'lifetime' as const,
    aggregation: METRIC_AGGREGATION.point_in_time,
  },
  follows: {
    key: 'facebook.page.follows',
    label: 'Page follows',
    sourceType: 'insights' as const,
    supportedAccess: ['authenticated'] as SocialAccessType[],
    /** Lifetime net follows (follows − unfollows) as of that day. Period is `day` only; not daily new follows. */
    metaMetric: 'page_follows',
    insightsPeriod: META_INSIGHTS_PERIOD.day,
    periodType: 'lifetime' as const,
    aggregation: METRIC_AGGREGATION.point_in_time,
  },
  reach: {
    key: 'facebook.page.reach',
    label: 'Media viewers',
    sourceType: 'insights' as const,
    supportedAccess: ['authenticated'] as SocialAccessType[],
    /** Unique people who viewed Page media. Replacement for deprecated page_impressions_unique. */
    metaMetric: 'page_total_media_view_unique',
    insightsPeriod: META_INSIGHTS_PERIOD.days_28,
    periodType: 'days_28' as const,
    aggregation: METRIC_AGGREGATION.non_additive,
  },
  engagement: {
    key: 'facebook.page.engagement',
    label: 'Post engagements',
    sourceType: 'insights' as const,
    supportedAccess: ['authenticated'] as SocialAccessType[],
    metaMetric: 'page_post_engagements',
    insightsPeriod: META_INSIGHTS_PERIOD.days_28,
    periodType: 'days_28' as const,
    /** Additive counts. Stored as Meta’s 28-day period total — do not sum rolling `days_28` windows. */
    aggregation: METRIC_AGGREGATION.sum,
  },
  postsPublished: {
    key: 'facebook.page.posts_published',
    label: 'Posts published',
    sourceType: 'posts' as const,
    supportedAccess: ['authenticated'] as SocialAccessType[],
    periodType: 'range' as const,
    aggregation: METRIC_AGGREGATION.sum,
  },
} as const

export const FACEBOOK_DERIVED_METRICS = {
  followerGrowth: {
    key: 'facebook.page.follower_growth',
    label: 'Follower growth',
    aggregation: METRIC_AGGREGATION.derived,
    persist: false as const,
  },
} as const

export type FacebookPageMetricId = keyof typeof FACEBOOK_PAGE_METRICS

export function facebookMetricByKey(key: string) {
  return Object.values(FACEBOOK_PAGE_METRICS).find((m) => m.key === key)
}

export function aggregationForMetricKey(key: string): MetricAggregation {
  if (key === FACEBOOK_DERIVED_METRICS.followerGrowth.key) return METRIC_AGGREGATION.derived
  return facebookMetricByKey(key)?.aggregation ?? METRIC_AGGREGATION.period_value
}
