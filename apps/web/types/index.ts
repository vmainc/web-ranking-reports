import type { RecordModel } from 'pocketbase'

export type IntegrationProvider =
  | 'google_analytics'
  | 'google_search_console'
  | 'lighthouse'
  | 'google_business_profile'
  | 'google_ads'
  | 'google_local_services_ads'
  | 'google_calendar'
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

/** PocketBase `sites` billing (per-site Stripe subscription, app-managed trial). */
export type SiteBillingStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'locked' | string

export type SiteLifecycle = 'prospect' | 'active'

export interface Site {
  id: string
  user: string
  name: string
  domain: string
  /** Present when loaded via /api/workspace/sites (owner/member can write; client read-only). */
  canWrite?: boolean
  logo?: string
  /** Last site audit result; present until the next run. */
  site_audit_result?: SiteAuditResult | null
  /** Cached last DataForSEO backlinks profile (saved when user runs Backlinks → Load). */
  backlinks_snapshot?: Record<string, unknown> | null
  rank_tracking_config?: Record<string, unknown> | null
  trial_ends_at?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  billing_status?: SiteBillingStatus | null
  /** Prospect sites do not consume active reporting slots. Missing → treat as active. */
  lifecycle?: SiteLifecycle | null
  promoted_at?: string | null
  promoted_from_proposal?: string | null
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

export type WorkspaceOwnerSubscriptionPlan = 'free' | 'starter' | 'growth' | 'agency' | 'comped'

export interface Report {
  id: string
  site: string
  type: string
  period_start: string
  period_end: string
  payload_json?: Record<string, unknown>
  created: string
  updated: string
  /** Set by GET `/api/reports/:id` — `getUserPlan` for the site owner (`sites.user`), not the caller. */
  workspaceOwnerPlan?: WorkspaceOwnerSubscriptionPlan
}

/** Weekly schedule options persisted in report payload_json.schedule. */
export interface ReportSchedule {
  enabled: boolean
  cadence: 'weekly'
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
}

/** PocketBase `report_schedules` — automated ranking snapshots (PDF/email later). */
export interface AutomatedReportScheduleRecord {
  id: string
  site: string
  report?: string
  frequency: 'daily' | 'weekly' | 'monthly'
  start_at: string
  from_email?: string | null
  to_email?: string | null
  sender_name?: string | null
  email_subject?: string | null
  last_run_at?: string | null
  last_delivery_status?: 'delivered' | 'failed' | 'skipped' | string | null
  last_delivery_error?: string | null
  last_delivery_at?: string | null
  last_email_opened_at?: string | null
  last_report_opened_at?: string | null
  next_run_at: string
  is_active?: boolean
  created_by: string
  created: string
  updated: string
  expand?: { site?: Site; report?: Report }
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

/** Pipeline stage for CRM clients (lead progression). */
export type CrmPipelineStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'

/** CRM client/contact (lead, client, or archived). */
export interface CrmClient {
  id: string
  user: string
  name: string
  name_prefix?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  business_phone?: string | null
  cell_phone?: string | null
  company?: string | null
  mailing_address_line1?: string | null
  mailing_address_line2?: string | null
  mailing_city?: string | null
  mailing_state?: string | null
  mailing_postal_code?: string | null
  mailing_country?: string | null
  status: 'lead' | 'client' | 'archived'
  notes?: string | null
  pipeline_stage?: CrmPipelineStage
  source?: string | null
  next_step?: string | null
  last_activity_at?: string | null
  tags_json?: string[] | null
  /** Optional link to one site (for onboarding / integrations). */
  site?: string | null
  created: string
  updated: string
  expand?: { site?: Site }
}

/** Inbound lead from SEOptimer webhook; not a CRM contact until converted. */
export interface SeoptimerLead {
  id: string
  user: string
  name?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  audit_url?: string | null
  pdf_report_url?: string | null
  notes?: string | null
  payload_json?: Record<string, unknown> | null
  crm_client?: string | null
  converted_at?: string | null
  received_at: string
  created: string
  updated: string
  expand?: { crm_client?: CrmClient }
}

/** One row for onboarding table: client + their linked site’s integrations. */
export interface OnboardingRow {
  client: {
    id: string
    name: string
    company?: string | null
    email?: string | null
    site?: string | null
    expand?: { site?: { id: string; name: string; domain: string } }
  }
  siteId: string | null
  integrations: Array<{ provider: IntegrationProvider; status: IntegrationStatus }>
}

/** CRM deal/sale linked to a client. */
export interface CrmSale {
  id: string
  user: string
  client: string
  title: string
  amount?: number | null
  status: 'open' | 'won' | 'lost'
  closed_at?: string | null
  notes?: string | null
  probability?: number | null
  expected_close_at?: string | null
  services_proposed?: string | null
  created: string
  updated: string
  expand?: { client?: CrmClient }
}

/** CRM contact point (call, email, meeting, note, automated report delivery, proposal events). */
export interface CrmContactPoint {
  id: string
  user: string
  client: string
  kind:
    | 'call'
    | 'email'
    | 'meeting'
    | 'note'
    | 'report_sent'
    | 'proposal_created'
    | 'proposal_sent'
    | 'proposal_viewed'
    | 'proposal_accepted'
    | 'proposal_declined'
    | 'proposal_superseded'
  happened_at: string
  summary?: string | null
  created: string
  updated: string
  expand?: { client?: CrmClient }
}

/** CRM task linked to a client. */
export interface CrmTask {
  id: string
  user: string
  client: string
  title: string
  due_at: string
  priority: 'low' | 'med' | 'high'
  status: 'open' | 'done'
  notes?: string | null
  created: string
  updated: string
  expand?: { client?: CrmClient }
}

/** Site-scoped To Do task (separate from CRM tasks). */
export interface TodoTask {
  id: string
  user: string
  site: string
  title: string
  due_at: string
  priority: 'low' | 'med' | 'high'
  status: 'open' | 'done'
  notes?: string | null
  created: string
  updated: string
  expand?: { site?: { id: string; name?: string; domain?: string } }
}

/** CRM outsourcing order (e.g. Fiverr) linked to a client. */
export interface CrmOutsourcing {
  id: string
  user: string
  client: string
  order_date: string
  service: string
  order_id?: string | null
  invoice_id?: string | null
  currency?: string | null
  total: number
  notes?: string | null
  created: string
  updated: string
  expand?: { client?: CrmClient }
}

/** Per-client digital snapshot intake (first-meeting benchmark notes). */
export interface CrmIntake {
  id: string
  user: string
  client: string
  snapshot_at?: string | null
  website_url?: string | null
  homepage_notes?: string | null
  local_visibility_notes?: string | null
  ads_presence_notes?: string | null
  analytics_notes?: string | null
  mobile_speed_notes?: string | null
  internal_note?: string | null
  created: string
  updated: string
  expand?: { client?: CrmClient }
}

export type ProposalStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'superseded'
  | 'expired'

export type ProposalItemSource = 'woo' | 'manual' | 'package'

export interface ProposalAcceptanceOptions {
  mark_deal_won?: boolean
  convert_lead_to_client?: boolean
  promote_site_to_active?: boolean
  create_onboarding_tasks?: boolean
  log_activity?: boolean
  set_pipeline_stage_won?: boolean
}

export interface ProposalSnapshot {
  captured_at: string
  website_url?: string
  intake?: Partial<CrmIntake>
  lighthouse?: Record<string, unknown> | null
  tech?: Record<string, unknown> | null
  seo_basic?: Record<string, unknown> | null
  keywords_limited?: Record<string, unknown> | null
}

export interface Proposal {
  id: string
  user: string
  client: string
  sale: string
  site?: string | null
  version: number
  status: ProposalStatus
  title: string
  intro_html?: string | null
  terms_html?: string | null
  currency: string
  subtotal?: number | null
  total?: number | null
  valid_until?: string | null
  snapshot_json?: ProposalSnapshot | null
  branding_json?: Record<string, unknown> | null
  public_token?: string | null
  sent_at?: string | null
  viewed_at?: string | null
  accepted_at?: string | null
  declined_at?: string | null
  accepted_by_name?: string | null
  accepted_by_email?: string | null
  acceptance_options_json?: ProposalAcceptanceOptions | null
  pdf_filename?: string | null
  created: string
  updated: string
  expand?: {
    client?: CrmClient
    sale?: CrmSale
    site?: Site
  }
}

export interface ProposalItem {
  id: string
  user: string
  proposal: string
  sort_order: number
  source: ProposalItemSource
  product?: string | null
  external_product_id?: string | null
  sku?: string | null
  name: string
  description?: string | null
  qty: number
  unit_price: number
  billing_interval?: 'one_time' | 'month' | 'year' | 'custom' | null
  metadata_json?: Record<string, unknown> | null
  created?: string
  updated?: string
}

export interface ProposalProduct {
  id: string
  user: string
  catalog_site: string
  external_id: string
  sku?: string | null
  name: string
  description?: string | null
  price: number
  regular_price?: number | null
  sale_price?: number | null
  currency?: string | null
  status: 'publish' | 'draft' | 'archived'
  woo_status?: string | null
  image_url?: string | null
  permalink?: string | null
  synced_at?: string | null
}

/** Email blast campaign (PocketBase `email_campaigns`). */
export type EmailCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent'

export interface EmailCampaign {
  id: string
  name: string
  subject: string
  body_html: string
  status: EmailCampaignStatus
  send_at?: string | null
  sent_at?: string | null
  created_by: string
  created: string
  updated: string
}

export type EmailRecipientStatus = 'pending' | 'sent' | 'failed'

export interface EmailRecipient {
  id: string
  campaign: string
  contact: string
  email: string
  status: EmailRecipientStatus
  sent_at?: string | null
  created: string
  updated: string
}

/** List row with counts from API. */
export interface EmailCampaignListItem extends EmailCampaign {
  recipientCount: number
  sentRecipientCount: number
}

/** Agency Planner (AI) — form input. */
export type AgencyPlannerAgencyType = 'seo' | 'ppc' | 'web_design' | 'full_service'
export type AgencyPlannerPrimaryGoal = 'more_clients' | 'retention' | 'improve_results' | 'scale_operations'

export interface AgencyPlannerFormInput {
  agencyType: AgencyPlannerAgencyType
  monthlyRevenue: string
  clientCount: number
  primaryGoal: AgencyPlannerPrimaryGoal
  notes: string
}

export interface AgencyPlannerGoal {
  title: string
  measurable?: string
}

export interface AgencyPlannerExecutionPlan {
  week1: string[]
  week2: string[]
  week3: string[]
  week4: string[]
}

export interface AgencyPlannerPlan {
  goals: AgencyPlannerGoal[]
  strategy: string
  execution_plan: AgencyPlannerExecutionPlan
  quick_wins: string[]
}

export interface AgencyPlannerSavedRow {
  id: string
  input_data: AgencyPlannerFormInput
  goals: AgencyPlannerGoal[]
  strategy: string
  execution_plan: AgencyPlannerExecutionPlan
  quick_wins: string[]
  created: string
}

export type SiteRecord = Site & RecordModel
export type IntegrationRecord = Integration & RecordModel
export type ReportRecord = Report & RecordModel
export type LeadFormRecord = LeadForm & RecordModel
export type LeadSubmissionRecord = LeadSubmission & RecordModel
export type CrmClientRecord = CrmClient & RecordModel
export type CrmSaleRecord = CrmSale & RecordModel
export type CrmContactPointRecord = CrmContactPoint & RecordModel
export type CrmTaskRecord = CrmTask & RecordModel
export type CrmOutsourcingRecord = CrmOutsourcing & RecordModel
export type CrmIntakeRecord = CrmIntake & RecordModel
export type ProposalRecord = Proposal & RecordModel
export type ProposalItemRecord = ProposalItem & RecordModel

export type {
  AIInsightsTone,
  FullReportSectionSettings,
  ImageBrandingAlignment,
  ReportBuilderModel,
  ReportModule,
  ReportModuleType,
  ReportPage,
  ReportThemeSettings,
} from './reportBuilder'
export { REPORT_BUILDER_PAYLOAD_KEY } from './reportBuilder'
