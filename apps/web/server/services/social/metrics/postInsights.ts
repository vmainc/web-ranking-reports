type InsightRow = { name?: string; period?: string; values?: Array<{ value?: unknown; end_time?: string }> }

function numeric(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) ? n : null
}

function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as Record<string, unknown>
}

function pickCount(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const n = numeric(record[key])
    if (n != null) return n
  }
  return 0
}

/** Empty `{}` from Meta means zero activity, not "unavailable". */
export function parseActivityByActionType(value: unknown): {
  likes: number
  comments: number
  shares: number
} {
  const record = asRecord(value)
  return {
    likes: pickCount(record, ['like', 'likes', 'reaction', 'reactions']),
    comments: pickCount(record, ['comment', 'comments']),
    shares: pickCount(record, ['share', 'shares']),
  }
}

export function parseReactionsByType(value: unknown): Record<string, number> {
  const record = asRecord(value)
  const out: Record<string, number> = {}
  for (const [key, raw] of Object.entries(record)) {
    const n = numeric(raw)
    if (n != null) out[key] = n
  }
  return out
}

export function sumReactionCounts(byType: Record<string, number>): number {
  return Object.values(byType).reduce((sum, n) => sum + n, 0)
}

export function latestInsightValue(row: InsightRow | undefined): unknown {
  const values = row?.values
  if (!Array.isArray(values) || !values.length) return undefined
  return values[values.length - 1]?.value
}

export function insightRowByName(rows: InsightRow[] | undefined, name: string): InsightRow | undefined {
  return (rows || []).find((row) => row.name === name)
}

export function parsePostInsightRows(rows: InsightRow[] | undefined): {
  reach: number | null
  views: number | null
  clicks: number | null
  likes: number
  comments: number
  shares: number
  reactionsByType: Record<string, number>
} {
  const activity = parseActivityByActionType(
    latestInsightValue(insightRowByName(rows, 'post_activity_by_action_type')),
  )
  const reactionsByType = parseReactionsByType(
    latestInsightValue(insightRowByName(rows, 'post_reactions_by_type_total')),
  )
  return {
    reach: numeric(latestInsightValue(insightRowByName(rows, 'post_total_media_view_unique'))),
    views: numeric(latestInsightValue(insightRowByName(rows, 'post_media_view'))),
    clicks: numeric(latestInsightValue(insightRowByName(rows, 'post_clicks'))),
    likes: activity.likes,
    comments: activity.comments,
    shares: activity.shares,
    reactionsByType,
  }
}

export function reactionsForPost(parsed: { likes: number; reactionsByType: Record<string, number> }): number {
  const typed = sumReactionCounts(parsed.reactionsByType)
  return typed > 0 ? typed : parsed.likes
}
