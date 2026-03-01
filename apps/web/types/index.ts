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

/** Lead form field (lead_forms.fields_json). */
export interface LeadFormField {
  key: string
  type: 'text' | 'email' | 'phone' | 'url' | 'textarea' | 'checkbox' | 'radio' | 'select' | 'hidden'
  label: string
  required?: boolean
  placeholder?: string
  helpText?: string
  options?: Array<{ value: string; label: string }>
}

/** Conditional rule: show field X when field Y equals Z. */
export interface LeadFormCondition {
  targetFieldKey: string
  sourceFieldKey: string
  operator: 'equals' | 'contains' | 'notEmpty'
  value?: string
}

export interface LeadForm {
  id: string
  site: string
  name: string
  status: 'draft' | 'published'
  fields_json?: LeadFormField[] | null
  conditional_json?: LeadFormCondition[] | null
  settings_json?: { successMessage?: string; redirectUrl?: string; notifyEmail?: boolean } | null
  created: string
  updated: string
}

export interface LeadSubmission {
  id: string
  form: string
  submitted_at: string
  lead_name?: string | null
  lead_email?: string | null
  lead_phone?: string | null
  lead_website?: string | null
  payload_json?: Record<string, unknown> | null
  status: 'new' | 'processing' | 'ready' | 'error' | 'archived'
  audit_json?: Record<string, unknown> | null
  error_text?: string | null
  created: string
  updated: string
  expand?: { form?: LeadForm }
}

export type SiteRecord = Site & RecordModel
export type IntegrationRecord = Integration & RecordModel
export type ReportRecord = Report & RecordModel
export type LeadFormRecord = LeadForm & RecordModel
export type LeadSubmissionRecord = LeadSubmission & RecordModel
