import type { RecordModel } from 'pocketbase'

export type IntegrationProvider =
  | 'google_analytics'
  | 'google_search_console'
  | 'lighthouse'
  | 'google_business_profile'
  | 'google_ads'
  | 'woocommerce'

export type IntegrationStatus = 'disconnected' | 'pending' | 'connected' | 'error'

export interface Site {
  id: string
  user: string
  name: string
  domain: string
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
