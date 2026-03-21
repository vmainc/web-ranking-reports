export interface EmailTemplatePayload {
  subject: string
  body: string
}

export const TRANSACTIONAL_APP_SETTINGS_KEY = 'transactional_email_templates'

/** App-side transactional template ids (must match catalog + defaults). */
export const TRANSACTIONAL_TEMPLATE_IDS = [
  'agency_member_invite',
  'client_invite',
  'site_access_granted',
  'agency_new_site',
  'report_ready',
  'lead_form_submission',
] as const

export type TransactionalTemplateId = (typeof TRANSACTIONAL_TEMPLATE_IDS)[number]
