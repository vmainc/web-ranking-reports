/** Client-side helpers/types for Workspace prospect audits. */

import type { CruxExperienceSummary } from '~/utils/pagespeedCrux'

export type ProspectLighthouseSummary = {
  strategy: 'mobile' | 'desktop'
  fetchTime?: string
  scores: {
    performance: number | null
    accessibility: number | null
    bestPractices: number | null
    seo: number | null
  }
  metrics: {
    lcp?: string
    cls?: string
    inp?: string
    fcp?: string
    ttfb?: string
    speedIndex?: string
  }
  fieldData?: CruxExperienceSummary | null
  originFieldData?: CruxExperienceSummary | null
}

export type ProspectAudit = {
  id: string
  domain: string
  status: 'ready' | 'partial' | 'failed'
  createdAt: string
  updatedAt: string
  whois?: {
    whois: {
      domain?: string
      createdAt?: string | null
      expiresAt?: string | null
      domainAgeYears?: number | null
      registrar?: string | null
      registrantOrg?: string | null
      registrantCountry?: string | null
      nameServers?: string[]
    }
    dns?: { a: string[]; aaaa: string[]; soa?: string }
    fetchedAt?: string
  }
  tech?: { url: string; fetchedAt: string; detected: Array<{ id: string; name: string }> }
  onPage?: {
    url: string
    title?: string
    metaDescription?: string
    h1?: string
    issues?: string[]
    wordCount?: number
  }
  lighthouseMobile?: ProspectLighthouseSummary
  lighthouseDesktop?: ProspectLighthouseSummary
  claudeAudit?: {
    summary?: string
    issues?: Array<{
      id: string
      severity: string
      area: string
      title: string
      description: string
      recommendation: string
    }>
  }
  keywords?: {
    totalKeywordCount?: number
    items: Array<{ keyword: string; position: number; searchVolume?: number | null; url?: string }>
  }
  aiCrawl?: {
    llmsTxt: { found: boolean; url: string; preview?: string }
    llmTxt: { found: boolean; url: string; preview?: string }
    robotsTxt: {
      found: boolean
      url: string
      preview?: string
      aiBots: Array<{ name: string; allowed: boolean | null; rule?: string }>
    }
  }
  talkingPoints?: string[]
  errors: Record<string, string>
  leadId?: string | null
}

export function scoreTone(score: number | null | undefined): string {
  if (score == null) return 'text-slate-400'
  if (score >= 90) return 'text-emerald-300'
  if (score >= 50) return 'text-amber-300'
  return 'text-rose-300'
}
