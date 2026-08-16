import type PocketBase from 'pocketbase'
import type { NormalizedSocialMetric } from '~/server/services/social/types'
import { COLLECTIONS } from '~/server/services/social/types'

export function snapshotDedupeKey(opts: {
  connectionId: string
  metricKey: string
  periodType: string
  periodStart: string
  periodEnd: string
}): string {
  return [opts.connectionId, opts.metricKey, opts.periodType, opts.periodStart, opts.periodEnd].join('|')
}

export type SnapshotRow = {
  id: string
  site: string
  social_connection: string
  provider: string
  platform: string
  asset_type: string
  metric_key: string
  value: number
  source: string
  is_exact: boolean
  confidence?: number
  period_type: string
  period_start: string
  period_end: string
  collected_at: string
  snapshot_date: string
  dedupe_key: string
}

function todayUtcDate(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

export async function upsertSocialMetricSnapshot(
  pb: PocketBase,
  opts: {
    siteId: string
    connectionId: string
    provider: string
    platform: string
    assetType: string
    metric: NormalizedSocialMetric
    snapshotDate?: string
  },
): Promise<{ id: string; created: boolean }> {
  if (opts.metric.value == null || !Number.isFinite(opts.metric.value)) {
    return { id: '', created: false }
  }
  const periodType = opts.metric.periodType || 'lifetime'
  const periodStart = opts.metric.periodStart || opts.snapshotDate || todayUtcDate()
  const periodEnd = opts.metric.periodEnd || periodStart
  const dedupe_key = snapshotDedupeKey({
    connectionId: opts.connectionId,
    metricKey: opts.metric.key,
    periodType,
    periodStart,
    periodEnd,
  })

  const payload = {
    site: opts.siteId,
    social_connection: opts.connectionId,
    provider: opts.provider,
    platform: opts.platform,
    asset_type: opts.assetType,
    metric_key: opts.metric.key,
    value: opts.metric.value,
    source: opts.metric.source,
    is_exact: opts.metric.isExact,
    confidence: opts.metric.confidence ?? null,
    period_type: periodType,
    period_start: periodStart,
    period_end: periodEnd,
    collected_at: opts.metric.collectedAt,
    snapshot_date: opts.snapshotDate || todayUtcDate(),
    dedupe_key,
  }

  try {
    const existing = await pb.collection(COLLECTIONS.socialMetricSnapshots).getFirstListItem<SnapshotRow>(
      `dedupe_key = "${dedupe_key.replace(/"/g, '\\"')}"`,
    )
    await pb.collection(COLLECTIONS.socialMetricSnapshots).update(existing.id, {
      value: payload.value,
      source: payload.source,
      is_exact: payload.is_exact,
      collected_at: payload.collected_at,
      confidence: payload.confidence,
    })
    return { id: existing.id, created: false }
  } catch {
    const created = await pb.collection(COLLECTIONS.socialMetricSnapshots).create<SnapshotRow>(payload)
    return { id: created.id, created: true }
  }
}

export async function listSnapshotsForConnection(
  pb: PocketBase,
  connectionId: string,
  opts?: { metricKey?: string; since?: string; until?: string; limit?: number },
): Promise<SnapshotRow[]> {
  const parts = [`social_connection = "${connectionId.replace(/"/g, '\\"')}"`]
  if (opts?.metricKey) parts.push(`metric_key = "${opts.metricKey.replace(/"/g, '\\"')}"`)
  if (opts?.since) parts.push(`snapshot_date >= "${opts.since.replace(/"/g, '\\"')}"`)
  if (opts?.until) parts.push(`snapshot_date <= "${opts.until.replace(/"/g, '\\"')}"`)
  return pb.collection(COLLECTIONS.socialMetricSnapshots).getFullList<SnapshotRow>({
    filter: parts.join(' && '),
    sort: 'snapshot_date',
    batch: opts?.limit && opts.limit < 200 ? opts.limit : 200,
  })
}

export function latestSnapshot(rows: SnapshotRow[], metricKey: string): SnapshotRow | null {
  const matches = rows.filter((r) => r.metric_key === metricKey)
  if (!matches.length) return null
  return matches.reduce((a, b) => (a.snapshot_date >= b.snapshot_date ? a : b))
}

export function snapshotOnOrBefore(rows: SnapshotRow[], metricKey: string, date: string): SnapshotRow | null {
  const matches = rows.filter((r) => r.metric_key === metricKey && r.snapshot_date <= date)
  if (!matches.length) return null
  return matches.reduce((a, b) => (a.snapshot_date >= b.snapshot_date ? a : b))
}
