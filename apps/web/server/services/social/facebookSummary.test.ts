import { describe, expect, it } from 'vitest'
import { followerTrendFromSnapshots } from '~/server/services/social/facebookSummary'
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
    period_type: 'lifetime',
    period_start: partial.snapshot_date,
    period_end: partial.snapshot_date,
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
