import type { NormalizedSocialMetric } from '~/server/services/social/types'

export function parseMetricNumber(raw: unknown): { value: number | null; isExact: boolean } {
  if (raw == null) return { value: null, isExact: true }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { value: raw, isExact: Number.isInteger(raw) || Number.isFinite(raw) }
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return { value: null, isExact: true }
    const compact = trimmed.replace(/,/g, '').toUpperCase()
    const abbreviated = compact.match(/^([0-9]*\.?[0-9]+)\s*([KMB])$/)
    if (abbreviated) {
      const n = Number(abbreviated[1])
      if (!Number.isFinite(n)) return { value: null, isExact: false }
      const mult = abbreviated[2] === 'K' ? 1_000 : abbreviated[2] === 'M' ? 1_000_000 : 1_000_000_000
      return { value: n * mult, isExact: false }
    }
    const numeric = Number(compact)
    if (Number.isFinite(numeric)) return { value: numeric, isExact: true }
  }
  return { value: null, isExact: true }
}

export function normalizedMetric(opts: {
  key: string
  raw: unknown
  source: string
  collectedAt: string
  periodType?: string
  periodStart?: string
  periodEnd?: string
  isExact?: boolean
  confidence?: number
}): NormalizedSocialMetric {
  const parsed = parseMetricNumber(opts.raw)
  const isExact = opts.isExact ?? parsed.isExact
  return {
    key: opts.key,
    value: parsed.value,
    source: opts.source,
    isExact,
    collectedAt: opts.collectedAt,
    periodType: opts.periodType,
    periodStart: opts.periodStart,
    periodEnd: opts.periodEnd,
    confidence: opts.confidence,
  }
}

/** Zero is a valid metric. Null means unavailable — never coerce unavailable to 0. */
export function metricAvailable(m: NormalizedSocialMetric | null | undefined): boolean {
  return Boolean(m && m.value != null && Number.isFinite(m.value))
}
