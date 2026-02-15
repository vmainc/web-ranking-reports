/**
 * GA4 Data API helpers: date ranges, runReport, simple cache.
 * All GA data stays server-side.
 */

export type DateRangePreset = 'last_7_days' | 'last_28_days' | 'last_90_days' | 'custom'
export type ComparePreset = 'previous_period' | 'none'

export function getDateRange(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string } {
  const end = new Date()
  let start = new Date()
  if (preset === 'last_7_days') {
    start.setDate(end.getDate() - 6)
  } else if (preset === 'last_28_days') {
    start.setDate(end.getDate() - 27)
  } else if (preset === 'last_90_days') {
    start.setDate(end.getDate() - 89)
  } else if (preset === 'custom' && customStart && customEnd) {
    start = new Date(customStart)
    return { startDate: customStart.slice(0, 10), endDate: customEnd.slice(0, 10) }
  } else {
    start.setDate(end.getDate() - 27)
  }
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

export function getCompareDateRange(
  preset: ComparePreset,
  mainStart: string,
  mainEnd: string
): { startDate: string; endDate: string } | null {
  if (preset === 'none') return null
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

const cache = new Map<string, { data: unknown; expires: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry || Date.now() > entry.expires) return null
  return entry.data as T
}

export function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS })
}

export function cacheKey(siteId: string, suffix: string, params: Record<string, string>): string {
  const q = new URLSearchParams(params).toString()
  return `ga4:${siteId}:${suffix}:${q}`
}

/** Clear cached GA4 data for a site (e.g. after disconnect so reconnect doesn't serve stale data). */
export function clearCacheForSite(siteId: string): void {
  const prefix = `ga4:${siteId}:`
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}

export interface RunReportParams {
  propertyId: string
  accessToken: string
  dateRanges: Array<{ startDate: string; endDate: string }>
  dimensions?: Array<{ name: string }>
  metrics: Array<{ name: string }>
  dimensionFilter?: unknown
  limit?: number
  orderBy?: Array<{ metric?: { metricName: string }; dimension?: { dimensionName: string }; desc: boolean }>
}

export async function runReport(params: RunReportParams): Promise<{
  rows: Array<{ dimensionValues: string[]; metricValues: number[] }>
  totals: Array<{ metricValues: number[] }>
  dimensionHeaders: string[]
  metricHeaders: string[]
}> {
  const body: Record<string, unknown> = {
    dateRanges: params.dateRanges,
    metrics: params.metrics.map((m) => ({ name: m.name })),
  }
  if (params.dimensions?.length) {
    body.dimensions = params.dimensions.map((d) => ({ name: d.name }))
  }
  if (params.dimensionFilter) body.dimensionFilter = params.dimensionFilter
  if (params.limit != null) body.limit = params.limit
  if (params.orderBy?.length) body.orderBys = params.orderBy

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${params.propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GA4 runReport failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as {
    rows?: Array<{
      dimensionValues?: Array<{ value?: string }>
      metricValues?: Array<{ value?: string }>
    }>
    totals?: Array<{ metricValues?: Array<{ value?: string }> }>
    dimensionHeaders?: Array<{ name?: string }>
    metricHeaders?: Array<{ name?: string }>
  }

  const dimensionHeaders = (data.dimensionHeaders ?? []).map((h) => h.name ?? '')
  const metricHeaders = (data.metricHeaders ?? []).map((h) => h.name ?? '')
  const rows = (data.rows ?? []).map((row) => ({
    dimensionValues: (row.dimensionValues ?? []).map((d) => d.value ?? ''),
    metricValues: (row.metricValues ?? []).map((m) => Number(m.value ?? 0)),
  }))
  const totals = (data.totals ?? []).map((t) => ({
    metricValues: (t.metricValues ?? []).map((m) => Number(m.value ?? 0)),
  }))

  return { rows, totals, dimensionHeaders, metricHeaders }
}
