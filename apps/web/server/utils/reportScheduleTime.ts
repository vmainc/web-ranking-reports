/** Frequency for automated report_schedules (PocketBase select values). */
export type ReportScheduleFrequency = 'daily' | 'weekly' | 'monthly'

/**
 * Add one calendar month, keeping clock time; if the day overflows (e.g. Jan 31 → Feb),
 * use the last valid day of the target month.
 */
export function addOneMonthUTC(d: Date): Date {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const day = d.getUTCDate()
  const h = d.getUTCHours()
  const min = d.getUTCMinutes()
  const s = d.getUTCSeconds()
  const ms = d.getUTCMilliseconds()

  const targetMonth = m + 1
  const targetYear = y + Math.floor(targetMonth / 12)
  const normMonth = ((targetMonth % 12) + 12) % 12

  const lastDay = new Date(Date.UTC(targetYear, normMonth + 1, 0)).getUTCDate()
  const useDay = Math.min(day, lastDay)

  return new Date(Date.UTC(targetYear, normMonth, useDay, h, min, s, ms))
}

/** Next run instant strictly after `from` for the given cadence. */
export function computeNextRunUtc(from: Date, frequency: ReportScheduleFrequency): Date {
  const d = new Date(from.getTime())
  if (frequency === 'daily') {
    d.setUTCDate(d.getUTCDate() + 1)
    return d
  }
  if (frequency === 'weekly') {
    d.setUTCDate(d.getUTCDate() + 7)
    return d
  }
  return addOneMonthUTC(d)
}

/**
 * First run time: use `start` if still in the future; otherwise advance by `frequency`
 * until strictly after `now` (per spec: past start dates → next valid slot).
 */
export function firstNextRunUtcFromStart(start: Date, frequency: ReportScheduleFrequency, now: Date = new Date()): Date {
  let t = new Date(start.getTime())
  if (t > now) return t
  const safety = 512
  let i = 0
  while (t <= now && i < safety) {
    t = computeNextRunUtc(t, frequency)
    i += 1
  }
  return t
}

export function parseIsoOrThrow(iso: string): Date {
  const d = new Date(iso.trim())
  if (Number.isNaN(d.getTime())) throw createError({ statusCode: 400, message: 'Invalid start date/time.' })
  return d
}
