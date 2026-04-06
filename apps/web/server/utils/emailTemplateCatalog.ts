/**
 * Unified catalog for Admin → Emails: PocketBase auth templates + app transactional templates.
 * App templates are stored in `app_settings` key `transactional_email_templates`.
 */

export type EmailTemplateSource = 'pocketbase_auth' | 'app_transactional'

export interface EmailTemplateDefinition {
  id: string
  source: EmailTemplateSource
  name: string
  description: string
  placeholders: string[]
}

/** PocketBase auth collection template keys (map to verificationTemplate, etc.) */
export const AUTH_TEMPLATE_IDS = ['verification', 'passwordReset', 'emailChange'] as const
export type AuthTemplateId = (typeof AUTH_TEMPLATE_IDS)[number]

export const EMAIL_TEMPLATE_CATALOG: EmailTemplateDefinition[] = [
  {
    id: 'verification',
    source: 'pocketbase_auth',
    name: 'Sign up / email verification',
    description: 'Sent when a new user registers and must confirm their email.',
    placeholders: ['{APP_NAME}', '{APP_URL}', '{TOKEN}', '{ACTION_URL}'],
  },
  {
    id: 'passwordReset',
    source: 'pocketbase_auth',
    name: 'Password reset',
    description: 'Sent when a user requests to reset their password.',
    placeholders: ['{APP_NAME}', '{APP_URL}', '{TOKEN}', '{ACTION_URL}'],
  },
  {
    id: 'emailChange',
    source: 'pocketbase_auth',
    name: 'Email change confirmation',
    description: 'Sent to confirm a change to the account email address.',
    placeholders: ['{APP_NAME}', '{APP_URL}', '{TOKEN}', '{ACTION_URL}'],
  },
  {
    id: 'agency_member_invite',
    source: 'app_transactional',
    name: 'Agency team member invite',
    description: 'Sent when the agency owner invites a teammate with full workspace access (same sites as the owner).',
    placeholders: [
      '{APP_NAME}',
      '{APP_URL}',
      '{INVITE_URL}',
      '{LOGIN_URL}',
      '{SET_PASSWORD_URL}',
      '{AGENCY_NAME}',
      '{MEMBER_NAME}',
      '{INVITER_NAME}',
    ],
  },
  {
    id: 'client_invite',
    source: 'app_transactional',
    name: 'Client portal invite',
    description: 'Invite an end client to log in with read-only access (use when your invite flow creates or notifies a client user).',
    placeholders: [
      '{APP_NAME}',
      '{APP_URL}',
      '{INVITE_URL}',
      '{LOGIN_URL}',
      '{SET_PASSWORD_URL}',
      '{AGENCY_NAME}',
      '{CLIENT_NAME}',
      '{INVITER_NAME}',
    ],
  },
  {
    id: 'site_access_granted',
    source: 'app_transactional',
    name: 'Site access granted',
    description: 'Notify a client that they can now view a specific site/dashboard.',
    placeholders: ['{APP_NAME}', '{APP_URL}', '{SITE_NAME}', '{SITE_DOMAIN}', '{SITE_URL}', '{AGENCY_NAME}'],
  },
  {
    id: 'agency_new_site',
    source: 'app_transactional',
    name: 'New site added (agency)',
    description: 'Optional notice when a new site is added to the agency account.',
    placeholders: ['{APP_NAME}', '{APP_URL}', '{SITE_NAME}', '{SITE_DOMAIN}', '{DASHBOARD_URL}'],
  },
  {
    id: 'report_ready',
    source: 'app_transactional',
    name: 'Report ready',
    description: 'Sent when a generated report is ready to open.',
    placeholders: ['{APP_NAME}', '{APP_URL}', '{REPORT_TITLE}', '{SITE_NAME}', '{REPORT_URL}'],
  },
  {
    id: 'lead_form_submission',
    source: 'app_transactional',
    name: 'New lead form submission',
    description: 'Notify the site owner when someone submits a lead form.',
    placeholders: [
      '{APP_NAME}',
      '{APP_URL}',
      '{SITE_NAME}',
      '{SITE_DOMAIN}',
      '{FORM_NAME}',
      '{LEAD_SUMMARY}',
      '{SUBMISSIONS_URL}',
    ],
  },
]
