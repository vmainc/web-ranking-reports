import type { RecordModel } from 'pocketbase'

export type IntegrationProvider =
  | 'google_analytics'
  | 'google_search_console'
  | 'lighthouse'
  | 'google_business_profile'
  | 'google_ads'
  | 'woocommerce'
  | 'bing_webmaster'

export type IntegrationStatus = 'disconnected' | 'pending' | 'connected' | 'error'

/** Stored result of the last Site Audit (Claude) run for this site. */
export interface SiteAuditResult {
  url: string
  fetchedAt: string
  summary: string
  issues: Array<{
    id: string
    severity: 'error' | 'warning' | 'info'
    area: string
    title: string
    description: string
    recommendation: string
  }>
}

export interface Site {
  id: string
  user: string
  name: string
  domain: string
  logo?: string
  /** Last site audit result; present until the next run. */
  site_audit_result?: SiteAuditResult | null
  created: string
  updated: string
  expand?: Record<string, unknown>
}

export interface Integration {
  id: string
  site: string
  provider: IntegrationProvider
  status: IntegrationStatus
  connected_at?: string
  config_json?: Record<string, unknown>
  created: string
  updated: string
  expand?: { site?: Site }
}

export interface Report {
  id: string
  site: string
  type: string
  period_start: string
  period_end: string
  payload_json?: Record<string, unknown>
  created: string
  updated: string
}

export type SiteRecord = Site & RecordModel
export type IntegrationRecord = Integration & RecordModel
export type ReportRecord = Report & RecordModel
