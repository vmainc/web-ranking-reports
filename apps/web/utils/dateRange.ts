/** Client-side date range helpers (mirrors server ga4Helpers for report API). */

export const REPORT_DATE_RANGE_PRESETS = [
  'last_7_days',
  'last_28_days',
  'last_90_days',
  'this_month',
  'last_month',
] as const

export type DateRangePreset = (typeof REPORT_DATE_RANGE_PRESETS)[number]

export const REPORT_DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_28_days', label: 'Last 28 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'this_month', label: 'This month (to date)' },
  { value: 'last_month', label: 'Previous calendar month' },
]

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isReportDateRangePreset(v: unknown): v is DateRangePreset {
  return typeof v === 'string' && (REPORT_DATE_RANGE_PRESETS as readonly string[]).includes(v)
}

export function coerceReportDateRangePreset(v: unknown, fallback: DateRangePreset = 'last_28_days'): DateRangePreset {
  return isReportDateRangePreset(v) ? v : fallback
}

export function getDateRangeForPreset(preset: DateRangePreset | string): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  if (preset === 'this_month') {
    start.setDate(1)
  } else if (preset === 'last_month') {
    const monthStart = new Date(end.getFullYear(), end.getMonth() - 1, 1)
    const monthEnd = new Date(end.getFullYear(), end.getMonth(), 0)
    return {
      startDate: formatLocalYmd(monthStart),
      endDate: formatLocalYmd(monthEnd),
    }
  } else if (preset === 'last_7_days') {
    start.setDate(end.getDate() - 6)
  } else if (preset === 'last_28_days') {
    start.setDate(end.getDate() - 27)
  } else if (preset === 'last_90_days') {
    start.setDate(end.getDate() - 89)
  } else {
    start.setDate(end.getDate() - 27)
  }
  return {
    startDate: formatLocalYmd(start),
    endDate: formatLocalYmd(end),
  }
}

export function formatDateRangePresetLabel(preset: string): string {
  return REPORT_DATE_RANGE_OPTIONS.find((o) => o.value === preset)?.label ?? preset
}

export function formatDateRangeSpan(preset: string): string {
  const { startDate, endDate } = getDateRangeForPreset(preset)
  return `${startDate} – ${endDate}`
}

/** YYYY-MM-DD for each calendar day from start through end (inclusive). */
export function eachDayInclusive(startDate: string, endDate: string): string[] {
  const out: string[] = []
  const [y1, m1, d1] = startDate.split('-').map(Number)
  const [y2, m2, d2] = endDate.split('-').map(Number)
  const cur = new Date(y1, m1 - 1, d1)
  const end = new Date(y2, m2 - 1, d2)
  while (cur <= end) {
    out.push(formatLocalYmd(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

/** GA4 `date` dimension as YYYYMMDD or ISO date → YYYY-MM-DD for lookup. */
export function normalizeReportDate(raw: string): string {
  const t = raw.trim()
  if (/^\d{8}$/.test(t)) return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  return t
}

/** One value per day in `isoDays`, filling 0 when GA omits a zero-traffic day. */
export function sessionsSeriesForDays(
  isoDays: string[],
  rows: Array<{ date: string; sessions: number }>,
): number[] {
  const map = new Map<string, number>()
  for (const r of rows) {
    map.set(normalizeReportDate(r.date), r.sessions)
  }
  return isoDays.map((d) => map.get(d) ?? 0)
}

export function getCompareDateRange(
  mainStart: string,
  mainEnd: string
): { startDate: string; endDate: string } {
  const start = new Date(mainStart)
  const end = new Date(mainEnd)
  const days = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
  const compareEnd = new Date(start)
  compareEnd.setDate(compareEnd.getDate() - 1)
  const compareStart = new Date(compareEnd)
  compareStart.setDate(compareStart.getDate() - days + 1)
  return {
    startDate: formatLocalYmd(compareStart),
    endDate: formatLocalYmd(compareEnd),
  }
}
