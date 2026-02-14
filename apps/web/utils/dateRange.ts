/** Client-side date range helpers (mirrors server ga4Helpers for report API). */

export type DateRangePreset = 'last_7_days' | 'last_28_days' | 'last_90_days'

export function getDateRangeForPreset(preset: DateRangePreset): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  if (preset === 'last_7_days') {
    start.setDate(end.getDate() - 6)
  } else if (preset === 'last_28_days') {
    start.setDate(end.getDate() - 27)
  } else if (preset === 'last_90_days') {
    start.setDate(end.getDate() - 89)
  } else {
    start.setDate(end.getDate() - 27)
  }
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
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
    startDate: compareStart.toISOString().slice(0, 10),
    endDate: compareEnd.toISOString().slice(0, 10),
  }
}
