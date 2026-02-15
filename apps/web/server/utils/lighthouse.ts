/**
 * Run PageSpeed Insights (Lighthouse) and optionally save to reports.
 * Uses PAGESPEED_API_KEY (optional but recommended for quota).
 */

import type PocketBase from 'pocketbase'

const PAGE_SPEED_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'] as const

export type LighthouseCategoryId = (typeof CATEGORIES)[number]

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

export interface LighthouseReportPayload {
  requestedUrl: string
  finalUrl: string
  fetchTime: string
  strategy: 'mobile' | 'desktop'
  categories: Record<LighthouseCategoryId, LighthouseCategorySummary>
  audits: Record<string, LighthouseAuditItem>
}

function buildPageUrl(domain: string): string {
  const d = domain.trim().toLowerCase()
  if (d.startsWith('http://') || d.startsWith('https://')) return d
  return `https://${d}`
}

export async function runPageSpeed(
  url: string,
  apiKey: string | undefined,
  strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<LighthouseReportPayload | null> {
  const params = new URLSearchParams()
  params.set('url', url)
  params.set('strategy', strategy)
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

  return {
    requestedUrl: lh.requestedUrl ?? url,
    finalUrl: lh.finalUrl ?? url,
    fetchTime: lh.fetchTime ?? new Date().toISOString(),
    strategy: (data?.configSettings?.formFactor === 'desktop' ? 'desktop' : 'mobile') as 'mobile' | 'desktop',
    categories,
    audits,
  }
}

/** Run Lighthouse for a site and save report to PocketBase. Called after Google connect or from run API. */
export async function runLighthouseForSite(pb: PocketBase, siteId: string): Promise<LighthouseReportPayload | null> {
  const config = useRuntimeConfig()
  const apiKey = (config.pagespeedApiKey as string) || undefined
  const site = await pb.collection('sites').getOne<{ domain: string }>(siteId)
  const domain = (site as { domain?: string }).domain
  if (!domain?.trim()) return null

  const url = buildPageUrl(domain)
  const payload = await runPageSpeed(url, apiKey, 'mobile')
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
