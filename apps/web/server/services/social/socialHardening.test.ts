import { describe, expect, it, beforeEach } from 'vitest'
import {
  aggregateInsightValues,
  periodFitsReportRange,
  takeLatestInsightValue,
  sumDailyInsightValues,
  addDaysYmd,
} from '~/server/services/social/metrics/aggregateInsights'
import {
  aggregationForMetricKey,
  FACEBOOK_DERIVED_METRICS,
  FACEBOOK_PAGE_METRICS,
  METRIC_AGGREGATION,
} from '~/server/services/social/metrics/registry'
import { snapshotDedupeKey } from '~/server/services/social/snapshots'
import { decideMetaPageMapping, planReconnectPageTokens } from '~/server/services/social/mapMetaPage'
import { walkGraphPages } from '~/server/utils/metaClient'
import { META_GRAPH_API_VERSION, META_OAUTH_SCOPES } from '~/server/utils/metaConfig'
import {
  evaluateFacebookSyncLock,
  resetInProcessFacebookSyncLockForTests,
  tryAcquireInProcessFacebookSyncLock,
  releaseInProcessFacebookSyncLock,
} from '~/server/services/social/socialSyncLock'

describe('OAuth permission list', () => {
  it('requests only the scopes WRR endpoints need', () => {
    expect([...META_OAUTH_SCOPES]).toEqual(['pages_show_list', 'pages_read_engagement', 'read_insights'])
    expect(META_OAUTH_SCOPES).not.toContain('pages_read_user_content')
  })
})

describe('Graph API version pin', () => {
  it('uses a single default version constant', () => {
    expect(META_GRAPH_API_VERSION).toBe('v25.0')
  })
})

describe('metric aggregation metadata', () => {
  it('marks followers as point-in-time and reach as non-additive', () => {
    expect(FACEBOOK_PAGE_METRICS.followers.aggregation).toBe(METRIC_AGGREGATION.point_in_time)
    expect(FACEBOOK_PAGE_METRICS.follows.aggregation).toBe(METRIC_AGGREGATION.point_in_time)
    expect(FACEBOOK_PAGE_METRICS.reach.aggregation).toBe(METRIC_AGGREGATION.non_additive)
    expect(FACEBOOK_PAGE_METRICS.engagement.aggregation).toBe(METRIC_AGGREGATION.sum)
    expect(FACEBOOK_PAGE_METRICS.postsPublished.aggregation).toBe(METRIC_AGGREGATION.sum)
    expect(FACEBOOK_DERIVED_METRICS.followerGrowth.aggregation).toBe(METRIC_AGGREGATION.derived)
    expect(FACEBOOK_DERIVED_METRICS.followerGrowth.persist).toBe(false)
  })

  it('looks up aggregation by WRR key', () => {
    expect(aggregationForMetricKey('facebook.page.reach')).toBe('non_additive')
    expect(aggregationForMetricKey('facebook.page.follower_growth')).toBe('derived')
  })
})

describe('non-additive reach is not summed', () => {
  const dailyUniques = [
    { value: 100, end_time: '2026-08-14T08:00:00+0000' },
    { value: 120, end_time: '2026-08-15T08:00:00+0000' },
    { value: 90, end_time: '2026-08-16T08:00:00+0000' },
  ]

  it('does not add unique-person day values', () => {
    const summed = sumDailyInsightValues(dailyUniques, { start: '2026-08-14', end: '2026-08-16' })
    expect(summed.value).toBe(310)

    const reach = aggregateInsightValues(dailyUniques, {
      aggregation: 'non_additive',
      seriesPeriod: 'day',
      range: { start: '2026-08-14', end: '2026-08-16' },
    })
    expect(reach.value).toBe(90)
    expect(reach.value).not.toBe(310)
  })

  it('takes Meta’s days_28 unique as a single period value', () => {
    const rolling = [
      { value: 8000, end_time: '2026-08-15T08:00:00+0000' },
      { value: 31420, end_time: '2026-08-16T08:00:00+0000' },
    ]
    const reach = aggregateInsightValues(rolling, {
      aggregation: FACEBOOK_PAGE_METRICS.reach.aggregation,
      seriesPeriod: FACEBOOK_PAGE_METRICS.reach.insightsPeriod,
    })
    expect(reach.value).toBe(31420)
    expect(reach.periodStart).toBe(addDaysYmd('2026-08-16', -27))
    expect(reach.periodEnd).toBe('2026-08-16')
  })

  it('does not sum rolling days_28 engagement windows either', () => {
    const rolling = [
      { value: 1000, end_time: '2026-08-15T08:00:00+0000' },
      { value: 1100, end_time: '2026-08-16T08:00:00+0000' },
    ]
    const engagement = aggregateInsightValues(rolling, {
      aggregation: FACEBOOK_PAGE_METRICS.engagement.aggregation,
      seriesPeriod: FACEBOOK_PAGE_METRICS.engagement.insightsPeriod,
    })
    expect(engagement.value).toBe(1100)
    expect(engagement.value).not.toBe(2100)
  })

  it('may sum daily additive engagement when the series is day-level', () => {
    const daily = [
      { value: 10, end_time: '2026-08-14T08:00:00+0000' },
      { value: 20, end_time: '2026-08-15T08:00:00+0000' },
      { value: 30, end_time: '2026-08-16T08:00:00+0000' },
    ]
    const engagement = aggregateInsightValues(daily, {
      aggregation: 'sum',
      seriesPeriod: 'day',
      range: { start: '2026-08-14', end: '2026-08-16' },
    })
    expect(engagement.value).toBe(60)
  })

  it('takes the latest daily page_follows instead of summing lifetime nets', () => {
    const follows = aggregateInsightValues(
      [
        { value: 400, end_time: '2026-08-14T08:00:00+0000' },
        { value: 410, end_time: '2026-08-16T08:00:00+0000' },
      ],
      {
        aggregation: FACEBOOK_PAGE_METRICS.follows.aggregation,
        seriesPeriod: FACEBOOK_PAGE_METRICS.follows.insightsPeriod,
        range: { start: '2026-08-14', end: '2026-08-16' },
      },
    )
    expect(follows.value).toBe(410)
    expect(follows.periodStart).toBe(follows.periodEnd)
  })
})

describe('report period matching', () => {
  it('shows a days_28 unique only when the report range matches that window', () => {
    const snapshot = {
      period_type: 'days_28',
      period_start: '2026-07-20',
      period_end: '2026-08-16',
    }
    expect(periodFitsReportRange(snapshot, { start: '2026-07-20', end: '2026-08-16' })).toBe(true)
    expect(periodFitsReportRange(snapshot, { start: '2026-08-10', end: '2026-08-16' })).toBe(false)
  })
})

describe('point-in-time follower snapshots preserve history', () => {
  it('uses a different dedupe key per observation day', () => {
    const aug15 = snapshotDedupeKey({
      connectionId: 'c1',
      metricKey: FACEBOOK_PAGE_METRICS.followers.key,
      periodType: 'lifetime',
      periodStart: '2026-08-15',
      periodEnd: '2026-08-15',
    })
    const aug16 = snapshotDedupeKey({
      connectionId: 'c1',
      metricKey: FACEBOOK_PAGE_METRICS.followers.key,
      periodType: 'lifetime',
      periodStart: '2026-08-16',
      periodEnd: '2026-08-16',
    })
    expect(aug15).not.toBe(aug16)
  })
})

describe('period metric dedupe', () => {
  it('upserts the same days_28 window', () => {
    const a = snapshotDedupeKey({
      connectionId: 'c1',
      metricKey: FACEBOOK_PAGE_METRICS.reach.key,
      periodType: 'days_28',
      periodStart: '2026-07-20',
      periodEnd: '2026-08-16',
    })
    const b = snapshotDedupeKey({
      connectionId: 'c1',
      metricKey: FACEBOOK_PAGE_METRICS.reach.key,
      periodType: 'days_28',
      periodStart: '2026-07-20',
      periodEnd: '2026-08-16',
    })
    expect(a).toBe(b)
  })

  it('keeps a different window as a separate snapshot', () => {
    const a = snapshotDedupeKey({
      connectionId: 'c1',
      metricKey: FACEBOOK_PAGE_METRICS.reach.key,
      periodType: 'days_28',
      periodStart: '2026-07-19',
      periodEnd: '2026-08-15',
    })
    const b = snapshotDedupeKey({
      connectionId: 'c1',
      metricKey: FACEBOOK_PAGE_METRICS.reach.key,
      periodType: 'days_28',
      periodStart: '2026-07-20',
      periodEnd: '2026-08-16',
    })
    expect(a).not.toBe(b)
  })
})

describe('Page discovery pagination', () => {
  it('collects every Graph page, not only the first response', async () => {
    const calls: string[] = []
    const items = await walkGraphPages<{ id: string }>({
      fetchPage: async (path) => {
        calls.push(path)
        if (path === 'me/accounts') {
          return { data: [{ id: '1' }, { id: '2' }], paging: { next: 'https://graph.facebook.com/v25.0/me/accounts?after=abc' } }
        }
        return { data: [{ id: '3' }] }
      },
      firstPath: 'me/accounts',
      firstQuery: { limit: '100' },
    })
    expect(items.map((p) => p.id)).toEqual(['1', '2', '3'])
    expect(calls).toHaveLength(2)
  })
})

describe('public → authenticated upgrade', () => {
  it('keeps the same connection id when identity matches', () => {
    const decision = decideMetaPageMapping({
      existing: { id: 'conn-public', access_type: 'public', status: 'active' },
      identityMatches: true,
    })
    expect(decision).toEqual({ action: 'upgrade', connectionId: 'conn-public' })
  })

  it('requires explicit mapping when the public URL does not match', () => {
    const decision = decideMetaPageMapping({
      existing: { id: 'conn-public', access_type: 'public', status: 'active' },
      identityMatches: false,
    })
    expect(decision.action).toBe('conflict_public')
    expect(decision.connectionId).toBe('conn-public')
  })
})

describe('reconnect preserves mapping', () => {
  it('refreshes the existing Page row by id and does not invent a second mapping', () => {
    const plan = planReconnectPageTokens({
      connections: [
        {
          id: 'conn-1',
          external_asset_id: '111',
          access_type: 'authenticated',
          status: 'active',
          canonical_url: 'https://www.facebook.com/oldname',
        },
      ],
      pages: [{ id: '111', access_token: 'new-page-token', name: 'Renamed Page', username: 'newslug' }],
    })
    expect(plan).toHaveLength(1)
    expect(plan[0].connectionId).toBe('conn-1')
    expect(plan[0].action).toBe('refresh_token')
    expect(plan[0].displayName).toBe('Renamed Page')
    expect(plan.filter((p) => p.action === 'refresh_token').map((p) => p.connectionId)).toEqual(['conn-1'])
  })

  it('marks missing Pages reconnect_required without dropping the row', () => {
    const plan = planReconnectPageTokens({
      connections: [{ id: 'conn-1', external_asset_id: '111', access_type: 'authenticated', status: 'active' }],
      pages: [],
    })
    expect(plan[0]).toMatchObject({ connectionId: 'conn-1', action: 'mark_reconnect_required' })
  })
})

describe('scheduler concurrency lock', () => {
  beforeEach(() => {
    resetInProcessFacebookSyncLockForTests()
  })

  it('allows only one in-process batch at a time', () => {
    expect(tryAcquireInProcessFacebookSyncLock('a')).toBe(true)
    expect(tryAcquireInProcessFacebookSyncLock('b')).toBe(false)
    releaseInProcessFacebookSyncLock('a')
    expect(tryAcquireInProcessFacebookSyncLock('b')).toBe(true)
  })

  it('steals a stale app_settings lock and skips a fresh one', () => {
    const now = Date.parse('2026-08-16T12:00:00.000Z')
    expect(
      evaluateFacebookSyncLock({
        existing: { owner: 'proc-a', startedAt: '2026-08-16T11:50:00.000Z' },
        nowMs: now,
        owner: 'proc-b',
      }).action,
    ).toBe('skip')
    expect(
      evaluateFacebookSyncLock({
        existing: { owner: 'proc-a', startedAt: '2026-08-16T10:00:00.000Z' },
        nowMs: now,
        owner: 'proc-b',
        staleMs: 45 * 60 * 1000,
      }).action,
    ).toBe('steal')
  })
})

describe('takeLatestInsightValue', () => {
  it('returns null when the series is empty', () => {
    expect(takeLatestInsightValue([]).value).toBeNull()
  })
})
