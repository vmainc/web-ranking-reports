import type { MetricAggregation } from '~/server/services/social/metrics/registry'
import type { DateRange } from '~/server/services/social/types'

export type InsightPoint = { value?: unknown; end_time?: string }

export type AggregatedInsight = {
  value: number | null
  periodStart?: string
  periodEnd?: string
}

function ymd(isoOrDate: string): string {
  return (isoOrDate || '').slice(0, 10)
}

export function addDaysYmd(ymdDate: string, days: number): string {
  const [y, m, d] = ymdDate.split('-').map(Number)
  if (!y || !m || !d) return ymdDate
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

export function daysBetweenYmd(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number)
  const [y2, m2, d2] = b.split('-').map(Number)
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return Number.POSITIVE_INFINITY
  const t1 = Date.UTC(y1, m1 - 1, d1)
  const t2 = Date.UTC(y2, m2 - 1, d2)
  return Math.round((t2 - t1) / 86_400_000)
}

export function periodWindowFromInsightEndTime(endTime: string, periodDays: number): { periodStart: string; periodEnd: string } {
  const periodEnd = ymd(endTime)
  const periodStart = addDaysYmd(periodEnd, -(periodDays - 1))
  return { periodStart, periodEnd }
}

function numericValue(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) ? n : null
}

function pointsInRange(values: InsightPoint[] | undefined, range?: DateRange): Array<InsightPoint & { day: string; n: number }> {
  const out: Array<InsightPoint & { day: string; n: number }> = []
  for (const row of values || []) {
    const day = ymd(row.end_time || '')
    if (!day) continue
    if (range && (day < range.start || day > range.end)) continue
    const n = numericValue(row.value)
    if (n == null) continue
    out.push({ ...row, day, n })
  }
  return out
}

/** Latest datapoint only. Used for unique / period totals / point-in-time. Never sums. */
export function takeLatestInsightValue(
  values: InsightPoint[] | undefined,
  opts?: { range?: DateRange; periodDays?: number },
): AggregatedInsight {
  const rows = pointsInRange(values, opts?.range)
  if (!rows.length) return { value: null }
  const last = rows.reduce((a, b) => (a.day >= b.day ? a : b))
  const window = periodWindowFromInsightEndTime(last.day, opts?.periodDays || 1)
  return { value: last.n, periodStart: window.periodStart, periodEnd: window.periodEnd }
}

/** Sum daily additive values. Invalid for unique-person metrics. */
export function sumDailyInsightValues(values: InsightPoint[] | undefined, range?: DateRange): AggregatedInsight {
  const rows = pointsInRange(values, range)
  if (!rows.length) return { value: null }
  let sum = 0
  let start = rows[0].day
  let end = rows[0].day
  for (const row of rows) {
    sum += row.n
    if (row.day < start) start = row.day
    if (row.day > end) end = row.day
  }
  return { value: sum, periodStart: start, periodEnd: end }
}

/**
 * Aggregate a Meta Insights series using WRR metric semantics.
 * `seriesPeriod` is the Graph `period=` used to fetch the series.
 * Rolling `days_28` windows must not be summed even when aggregation is `sum`.
 */
export function aggregateInsightValues(
  values: InsightPoint[] | undefined,
  opts: {
    aggregation: MetricAggregation
    seriesPeriod: 'day' | 'days_28'
    range?: DateRange
  },
): AggregatedInsight {
  if (opts.aggregation === 'derived') return { value: null }

  if (opts.aggregation === 'non_additive' || opts.aggregation === 'period_value' || opts.aggregation === 'point_in_time') {
    return takeLatestInsightValue(values, {
      range: opts.range,
      periodDays: opts.seriesPeriod === 'days_28' ? 28 : 1,
    })
  }

  if (opts.aggregation === 'sum') {
    if (opts.seriesPeriod === 'days_28') {
      return takeLatestInsightValue(values, { range: opts.range, periodDays: 28 })
    }
    return sumDailyInsightValues(values, opts.range)
  }

  return { value: null }
}

export function periodFitsReportRange(
  snapshot: { period_start?: string; period_end?: string; period_type?: string },
  range: DateRange,
  opts?: { toleranceDays?: number },
): boolean {
  const start = ymd(snapshot.period_start || '')
  const end = ymd(snapshot.period_end || '')
  if (!start || !end) return false
  const tol = opts?.toleranceDays ?? 2
  return Math.abs(daysBetweenYmd(start, range.start)) <= tol && Math.abs(daysBetweenYmd(end, range.end)) <= tol
}

export function formatPeriodCaption(opts: {
  aggregation: MetricAggregation
  periodStart?: string
  periodEnd?: string
}): string {
  const start = ymd(opts.periodStart || '')
  const end = ymd(opts.periodEnd || '')
  if (opts.aggregation === 'point_in_time') {
    return end ? `as of ${end}` : start ? `as of ${start}` : ''
  }
  if (opts.aggregation === 'derived') return 'during selected period'
  if (start && end && start !== end) return `${start} – ${end}`
  if (end) return end
  return ''
}
