import { getAdminPb, adminAuth, getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'
import { DEFAULT_TRANSACTIONAL_TEMPLATES } from '~/server/utils/defaultTransactionalEmailTemplates'
import {
  TRANSACTIONAL_APP_SETTINGS_KEY,
  TRANSACTIONAL_TEMPLATE_IDS,
  type EmailTemplatePayload,
} from '~/server/api/admin/transactional-email-templates.shared'

function pickPartial(t: unknown): Partial<EmailTemplatePayload> {
  if (!t || typeof t !== 'object') return {}
  const o = t as { subject?: string; body?: string }
  const out: Partial<EmailTemplatePayload> = {}
  if (typeof o.subject === 'string') out.subject = o.subject
  if (typeof o.body === 'string') out.body = o.body
  return out
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const adminEmails = getAdminEmails()
  const pb = getAdminPb()
  await adminAuth(pb)
  const userRecord = await pb.collection('users').getOne<{ email?: string }>(userId)
  const userEmail = userRecord?.email?.toLowerCase?.()
  if (!userEmail || !adminEmails.map((e: string) => e.toLowerCase()).includes(userEmail)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  let stored: Record<string, unknown> = {}
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value?: Record<string, unknown> }>(
      `key="${TRANSACTIONAL_APP_SETTINGS_KEY}"`,
    )
    const v = row?.value
    if (v && typeof v === 'object' && !Array.isArray(v)) stored = v as Record<string, unknown>
  } catch {
    // no row yet — defaults only
  }

  const transactional: Record<string, EmailTemplatePayload> = {}
  for (const id of TRANSACTIONAL_TEMPLATE_IDS) {
    const def = DEFAULT_TRANSACTIONAL_TEMPLATES[id] ?? { subject: '', body: '' }
    transactional[id] = { ...def, ...pickPartial(stored[id]) }
  }

  return { transactional }
})
