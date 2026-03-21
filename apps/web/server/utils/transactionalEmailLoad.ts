import type PocketBase from 'pocketbase'
import { DEFAULT_TRANSACTIONAL_TEMPLATES } from '~/server/utils/defaultTransactionalEmailTemplates'
import {
  TRANSACTIONAL_APP_SETTINGS_KEY,
  type EmailTemplatePayload,
  type TransactionalTemplateId,
} from '~/server/api/admin/transactional-email-templates.shared'

/** Merge stored template with defaults (same rules as Admin manifest). */
export async function loadTransactionalTemplate(
  pb: PocketBase,
  id: TransactionalTemplateId,
): Promise<EmailTemplatePayload> {
  const def = DEFAULT_TRANSACTIONAL_TEMPLATES[id] ?? { subject: '', body: '' }
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value?: Record<string, unknown> }>(
      `key="${TRANSACTIONAL_APP_SETTINGS_KEY}"`,
    )
    const raw = row?.value?.[id]
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const o = raw as { subject?: string; body?: string }
      const partial: Partial<EmailTemplatePayload> = {}
      if (typeof o.subject === 'string') partial.subject = o.subject
      if (typeof o.body === 'string') partial.body = o.body
      return { ...def, ...partial }
    }
  } catch {
    // use defaults
  }
  return { ...def }
}

/** Replace `{KEY}` placeholders in subject/body (values should not include braces). */
export function applyEmailPlaceholders(template: EmailTemplatePayload, vars: Record<string, string>): EmailTemplatePayload {
  let subject = template.subject
  let body = template.body
  for (const [k, v] of Object.entries(vars)) {
    const token = `{${k}}`
    subject = subject.split(token).join(v)
    body = body.split(token).join(v)
  }
  return { subject, body }
}
