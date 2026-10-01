/**
 * PageSpeed Insights (lab Lighthouse + CrUX field data).
 * Uses PAGESPEED_API_KEY (optional but recommended for quota).
 */

import type PocketBase from 'pocketbase'

const PAGE_SPEED_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'] as const

export type LighthouseCategoryId = (typeof CATEGORIES)[number]

export type CruxCategory = 'FAST' | 'AVERAGE' | 'SLOW'

export interface LighthouseCategorySummary {
  id: LighthouseCategoryId
  title: string
  description?: string
  score: number
  auditRefs: Array<{ id: string; weight: number }>
}

export interface LighthouseAuditItem {
  id: string
  title: string
  description?: string
  score: number | null
  displayValue?: string
  details?: unknown
}

export interface CruxMetricSummary {
  id: string
  label: string
  percentile: number | null
  displayValue: string | null
  category: CruxCategory | null
}

export interface CruxExperienceSummary {
  id?: string
  overallCategory: CruxCategory | null
  metrics: CruxMetricSummary[]
}

export interface LighthouseReportPayload {
  requestedUrl: string
  finalUrl: string
  fetchTime: string
  strategy: 'mobile' | 'desktop'
  categories: Record<LighthouseCategoryId, LighthouseCategorySummary>
  audits: Record<string, LighthouseAuditItem>
  /** URL-level CrUX (real-user) field data when available. */
  fieldData?: CruxExperienceSummary | null
  /** Origin-level CrUX field data when URL-level is thin/missing. */
  originFieldData?: CruxExperienceSummary | null
}

type PsiMetric = {
  percentile?: number
  category?: string
  distributions?: Array<{ min?: number; max?: number; proportion?: number }>
}

type PsiLoadingExperience = {
  id?: string
  overall_category?: string
  metrics?: Record<string, PsiMetric>
}

const CRUX_METRIC_ORDER = [
  'LARGEST_CONTENTFUL_PAINT_MS',
  'INTERACTION_TO_NEXT_PAINT',
  'CUMULATIVE_LAYOUT_SHIFT_SCORE',
  'FIRST_CONTENTFUL_PAINT_MS',
  'EXPERIMENTAL_TIME_TO_FIRST_BYTE',
] as const

const CRUX_LABELS: Record<string, string> = {
  LARGEST_CONTENTFUL_PAINT_MS: 'LCP',
  INTERACTION_TO_NEXT_PAINT: 'INP',
  CUMULATIVE_LAYOUT_SHIFT_SCORE: 'CLS',
  FIRST_CONTENTFUL_PAINT_MS: 'FCP',
  EXPERIMENTAL_TIME_TO_FIRST_BYTE: 'TTFB',
}

function buildPageUrl(domain: string): string {
  const d = domain.trim().toLowerCase()
  if (d.startsWith('http://') || d.startsWith('https://')) return d
  return `https://${d}`
}

function normalizeCruxCategory(value: unknown): CruxCategory | null {
  const raw = String(value || '').trim().toUpperCase()
  if (raw === 'FAST' || raw === 'AVERAGE' || raw === 'SLOW') return raw
  return null
}

function formatCruxDisplay(metricId: string, percentile: number | null): string | null {
  if (percentile == null || !Number.isFinite(percentile)) return null
  if (metricId === 'CUMULATIVE_LAYOUT_SHIFT_SCORE') {
    return (percentile / 100).toFixed(2)
  }
  if (metricId.endsWith('_MS') || metricId === 'INTERACTION_TO_NEXT_PAINT') {
    if (percentile >= 1000) return `${(percentile / 1000).toFixed(1)} s`
    return `${Math.round(percentile)} ms`
  }
  return String(percentile)
}

export function parseCruxExperience(raw: PsiLoadingExperience | undefined | null): CruxExperienceSummary | null {
  if (!raw || (!raw.metrics && !raw.overall_category)) return null
  const metricsMap = raw.metrics || {}
  const metrics: CruxMetricSummary[] = []
  const seen = new Set<string>()

  for (const id of CRUX_METRIC_ORDER) {
    const m = metricsMap[id]
    if (!m) continue
    const percentile = typeof m.percentile === 'number' ? m.percentile : null
    metrics.push({
      id,
      label: CRUX_LABELS[id] || id,
      percentile,
      displayValue: formatCruxDisplay(id, percentile),
      category: normalizeCruxCategory(m.category),
    })
    seen.add(id)
  }

  for (const [id, m] of Object.entries(metricsMap)) {
    if (seen.has(id) || !m) continue
    const percentile = typeof m.percentile === 'number' ? m.percentile : null
    metrics.push({
      id,
      label: CRUX_LABELS[id] || id.replace(/_/g, ' '),
      percentile,
      displayValue: formatCruxDisplay(id, percentile),
      category: normalizeCruxCategory(m.category),
    })
  }

  if (!metrics.length && !raw.overall_category) return null
  return {
    id: raw.id,
    overallCategory: normalizeCruxCategory(raw.overall_category),
    metrics,
  }
}

export async function runPageSpeed(
  url: string,
  apiKey: string | undefined,
  strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<LighthouseReportPayload | null> {
  const params = new URLSearchParams()
  params.set('url', url)
  // PageSpeed API expects strategy=DESKTOP or strategy=MOBILE (uppercase)
  params.set('strategy', strategy.toUpperCase())
  CATEGORIES.forEach((c) => params.append('category', c))
  if (apiKey) params.set('key', apiKey)

  const res = await fetch(`${PAGE_SPEED_BASE}?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PageSpeed API ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    id?: string
    loadingExperience?: PsiLoadingExperience
    originLoadingExperience?: PsiLoadingExperience
    lighthouseResult?: {
      requestedUrl?: string
      finalUrl?: string
      fetchTime?: string
      categories?: Record<
        string,
        {
          id: string
          title: string
          description?: string
          score: number | null
          auditRefs?: Array<{ id: string; weight?: number }>
        }
      >
      audits?: Record<
        string,
        {
          id: string
          title: string
          description?: string
          score: number | null
          displayValue?: string
          details?: unknown
        }
      >
    }
    configSettings?: { formFactor?: string }
  }

  const lh = data?.lighthouseResult
  if (!lh?.categories) return null

  const categories: Record<LighthouseCategoryId, LighthouseCategorySummary> = {} as Record<
    LighthouseCategoryId,
    LighthouseCategorySummary
  >
  for (const id of CATEGORIES) {
    const cat = lh.categories[id]
    if (cat) {
      categories[id] = {
        id: id as LighthouseCategoryId,
        title: cat.title ?? id,
        description: cat.description,
        score: typeof cat.score === 'number' ? cat.score : 0,
        auditRefs: (cat.auditRefs ?? []).map((r) => ({ id: r.id, weight: r.weight ?? 1 })),
      }
    }
  }

  const audits: Record<string, LighthouseAuditItem> = {}
  const auditMap = lh.audits ?? {}
  for (const key of Object.keys(auditMap)) {
    const a = auditMap[key]
    if (a)
      audits[key] = {
        id: a.id,
        title: a.title ?? a.id,
        description: a.description,
        score: a.score ?? null,
        displayValue: a.displayValue,
        details: a.details,
      }
  }

  // Use the strategy we requested so save/retrieve by tab is reliable
  const resolvedStrategy: 'mobile' | 'desktop' = strategy === 'desktop' ? 'desktop' : 'mobile'
  return {
    requestedUrl: lh.requestedUrl ?? url,
    finalUrl: lh.finalUrl ?? url,
    fetchTime: lh.fetchTime ?? new Date().toISOString(),
    strategy: resolvedStrategy,
    categories,
    audits,
    fieldData: parseCruxExperience(data.loadingExperience),
    originFieldData: parseCruxExperience(data.originLoadingExperience),
  }
}

/** Get PageSpeed API key from app_settings (admin-configured) or env. */
export async function getPageSpeedApiKey(pb: PocketBase): Promise<string | undefined> {
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value: { api_key?: string } }>('key="pagespeed_api_key"')
    const key = row?.value?.api_key?.trim()
    if (key) return key
  } catch {
    // no row or missing collection
  }
  const config = useRuntimeConfig()
  return (config.pagespeedApiKey as string)?.trim() || undefined
}

/** Run PageSpeed Insights for a URL (no PB save). Used by lead/prospect audit. */
export async function runLighthouseForUrl(
  url: string,
  strategy: 'mobile' | 'desktop' = 'mobile',
  apiKey?: string
): Promise<LighthouseReportPayload | null> {
  const normalized = url.trim().toLowerCase().startsWith('http') ? url : `https://${url}`
  return runPageSpeed(normalized, apiKey ?? undefined, strategy)
}

/** Run PageSpeed for a site and save report to PocketBase. */
export async function runLighthouseForSite(
  pb: PocketBase,
  siteId: string,
  strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<LighthouseReportPayload | null> {
  const apiKey = await getPageSpeedApiKey(pb)
  const site = await pb.collection('sites').getOne<{ domain: string }>(siteId)
  const domain = (site as { domain?: string }).domain
  if (!domain?.trim()) return null

  const url = buildPageUrl(domain)
  const payload = await runLighthouseForUrl(url, strategy, apiKey)
  if (!payload) return null

  const now = new Date().toISOString()
  await pb.collection('reports').create({
    site: siteId,
    type: 'lighthouse',
    period_start: now.slice(0, 10),
    period_end: now.slice(0, 10),
    payload_json: payload as unknown as Record<string, unknown>,
  })
  return payload
}
