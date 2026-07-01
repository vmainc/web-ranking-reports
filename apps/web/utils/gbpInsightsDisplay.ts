/** Display helpers for Google Business Profile performance metrics. */

export const GBP_IMPRESSION_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
] as const

export type GbpInsightsTotals = Record<string, number>

export function gbpTotalImpressions(totals: GbpInsightsTotals | null | undefined): number {
  if (!totals) return 0
  return GBP_IMPRESSION_METRICS.reduce((sum, key) => sum + (totals[key] ?? 0), 0)
}

export function gbpRowImpressions(row: Record<string, number | string>): number {
  return GBP_IMPRESSION_METRICS.reduce((sum, key) => sum + Number(row[key] ?? 0), 0)
}

export function gbpMetricTotal(totals: GbpInsightsTotals | null | undefined, key: string): number {
  return totals?.[key] ?? 0
}
