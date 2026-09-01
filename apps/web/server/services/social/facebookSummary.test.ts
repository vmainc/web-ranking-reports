import { describe, expect, it } from 'vitest'
import { followerTrendFromSnapshots, latestDailyPoints, sumDailyMetricSnapshots } from '~/server/services/social/facebookSummary'
import { FACEBOOK_PAGE_METRICS } from '~/server/services/social/metrics/registry'
import { publicSocialPost, sortSocialPosts, type SocialPostRow } from '~/server/services/social/socialPosts'
import type { SnapshotRow } from '~/server/services/social/snapshots'

function row(partial: Partial<SnapshotRow> & { snapshot_date: string; value: number }): SnapshotRow {
  return {
    id: partial.id || 's',
    site: 'site',
    social_connection: 'c1',
    provider: 'meta',
    platform: 'facebook',
    asset_type: 'page',
    metric_key: partial.metric_key || 'facebook.page.followers',
    value: partial.value,
    source: 'graph',
    is_exact: true,
    period_type: partial.period_type || 'lifetime',
    period_start: partial.period_start || partial.snapshot_date,
    period_end: partial.period_end || partial.snapshot_date,
    collected_at: partial.collected_at || `${partial.snapshot_date}T12:00:00.000Z`,
    snapshot_date: partial.snapshot_date,
    dedupe_key: 'k',
  }
}

describe('followerTrendFromSnapshots', () => {
  it('keeps one followers point per day and sorts by date', () => {
    const trend = followerTrendFromSnapshots([
      row({ snapshot_date: '2026-08-17', value: 200, collected_at: '2026-08-17T18:00:00.000Z' }),
      row({ snapshot_date: '2026-08-16', value: 180 }),
      row({ snapshot_date: '2026-08-17', value: 190, collected_at: '2026-08-17T08:00:00.000Z' }),
      row({ snapshot_date: '2026-08-16', value: 1, metric_key: 'facebook.page.reach' }),
    ])
    expect(trend).toEqual([
      { date: '2026-08-16', value: 180 },
      { date: '2026-08-17', value: 200 },
    ])
  })
})

describe('sumDailyMetricSnapshots', () => {
  const range7 = { start: '2026-08-10', end: '2026-08-16' }

  it('sums daily engagement across a 7-day range and ignores 28-day window rows', () => {
    const rows = [
      row({
        snapshot_date: '2026-08-16',
        value: 9000,
        metric_key: FACEBOOK_PAGE_METRICS.engagement.key,
        period_type: 'days_28',
        period_start: '2026-07-20',
        period_end: '2026-08-16',
      }),
      row({ snapshot_date: '2026-08-10', value: 10, metric_key: FACEBOOK_PAGE_METRICS.engagementDay.key }),
      row({ snapshot_date: '2026-08-12', value: 4, metric_key: FACEBOOK_PAGE_METRICS.engagementDay.key }),
      row({ snapshot_date: '2026-08-16', value: 6, metric_key: FACEBOOK_PAGE_METRICS.engagementDay.key }),
      row({ snapshot_date: '2026-08-09', value: 99, metric_key: FACEBOOK_PAGE_METRICS.engagementDay.key }),
    ]
    const summed = sumDailyMetricSnapshots(rows, FACEBOOK_PAGE_METRICS.engagementDay.key, range7)
    expect(summed).toEqual({ value: 20, periodStart: '2026-08-10', periodEnd: '2026-08-16', days: 3 })
  })

  it('keeps the latest collection of a day instead of double-counting', () => {
    const summed = sumDailyMetricSnapshots(
      [
        row({
          snapshot_date: '2026-08-12',
          value: 4,
          metric_key: FACEBOOK_PAGE_METRICS.engagementDay.key,
          collected_at: '2026-08-12T08:00:00.000Z',
        }),
        row({
          snapshot_date: '2026-08-12',
          value: 5,
          metric_key: FACEBOOK_PAGE_METRICS.engagementDay.key,
          collected_at: '2026-08-12T18:00:00.000Z',
        }),
      ],
      FACEBOOK_PAGE_METRICS.engagementDay.key,
      range7,
    )
    expect(summed.value).toBe(5)
    expect(summed.days).toBe(1)
  })

  it('returns null when no daily points exist (so callers can fall back to days_28)', () => {
    const summed = sumDailyMetricSnapshots(
      [
        row({
          snapshot_date: '2026-08-16',
          value: 9000,
          metric_key: FACEBOOK_PAGE_METRICS.engagement.key,
          period_type: 'days_28',
          period_start: '2026-07-20',
          period_end: '2026-08-16',
        }),
      ],
      FACEBOOK_PAGE_METRICS.engagementDay.key,
      range7,
    )
    expect(summed).toEqual({ value: null, days: 0 })
  })

  it('exposes a daily series for charts', () => {
    const series = latestDailyPoints(
      [
        row({ snapshot_date: '2026-08-16', value: 6, metric_key: FACEBOOK_PAGE_METRICS.engagementDay.key }),
        row({ snapshot_date: '2026-08-10', value: 10, metric_key: FACEBOOK_PAGE_METRICS.engagementDay.key }),
      ],
      FACEBOOK_PAGE_METRICS.engagementDay.key,
      range7,
    )
    expect(series).toEqual([
      { date: '2026-08-10', value: 10 },
      { date: '2026-08-16', value: 6 },
    ])
  })
})

describe('public social posts', () => {
  const base: SocialPostRow = {
    id: 'p1',
    site: 'site',
    social_connection: 'c1',
    provider: 'meta',
    platform: 'facebook',
    asset_type: 'facebook_page',
    external_post_id: 'page_1',
    published_at: '2026-08-15T12:00:00+0000',
    message: 'Hello',
    permalink: 'https://facebook.com/1',
    media_url: 'https://img',
    media_type: 'photo',
    reactions: 3,
    comments: 1,
    shares: 0,
    reach: 40,
    views: 80,
    clicks: 2,
    metrics_json: { reactionsByType: { like: 2, love: 1 } },
    collected_at: '2026-08-16T00:00:00.000Z',
    snapshot_date: '2026-08-16',
    dedupe_key: 'c1|page_1',
  }

  it('maps stored posts without leaking connection internals', () => {
    expect(publicSocialPost(base)).toEqual({
      id: 'p1',
      externalPostId: 'page_1',
      publishedAt: '2026-08-15T12:00:00+0000',
      message: 'Hello',
      permalink: 'https://facebook.com/1',
      mediaUrl: 'https://img',
      mediaType: 'photo',
      reactions: 3,
      comments: 1,
      shares: 0,
      reach: 40,
      views: 80,
      clicks: 2,
      reactionsByType: { like: 2, love: 1 },
    })
  })

  it('sorts top posts by reach, then recency', () => {
    const low = { ...base, id: 'low', reach: 10, published_at: '2026-08-16T12:00:00+0000' }
    const highOld = { ...base, id: 'highOld', reach: 50, published_at: '2026-08-01T12:00:00+0000' }
    const highNew = { ...base, id: 'highNew', reach: 50, published_at: '2026-08-14T12:00:00+0000' }
    expect(sortSocialPosts([low, highOld, highNew], 'reach').map((p) => p.id)).toEqual([
      'highNew',
      'highOld',
      'low',
    ])
  })
})
