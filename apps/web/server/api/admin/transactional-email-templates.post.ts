import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'
import { DEFAULT_TRANSACTIONAL_TEMPLATES } from '~/server/utils/defaultTransactionalEmailTemplates'
import {
  TRANSACTIONAL_APP_SETTINGS_KEY,
  TRANSACTIONAL_TEMPLATE_IDS,
  type EmailTemplatePayload,
} from '~/server/api/admin/transactional-email-templates.shared'

function isTransactionalId(id: string): id is (typeof TRANSACTIONAL_TEMPLATE_IDS)[number] {
  return (TRANSACTIONAL_TEMPLATE_IDS as readonly string[]).includes(id)
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

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

  const body = (await readBody(event).catch(() => ({}))) as {
    id?: string
    subject?: string
    body?: string
  }

  const id = typeof body.id === 'string' ? body.id.trim() : ''
  if (!id || !isTransactionalId(id)) {
    throw createError({ statusCode: 400, message: 'Invalid template id.' })
  }

  const subject = typeof body.subject === 'string' ? body.subject : ''
  const htmlBody = typeof body.body === 'string' ? body.body : ''

  let current: Record<string, EmailTemplatePayload> = {}
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ id: string; value?: Record<string, unknown> }>(
      `key="${TRANSACTIONAL_APP_SETTINGS_KEY}"`,
    )
    const v = row.value
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const k of Object.keys(v)) {
        const t = v[k]
        if (t && typeof t === 'object' && !Array.isArray(t)) {
          const o = t as { subject?: string; body?: string }
          current[k] = {
            subject: typeof o.subject === 'string' ? o.subject : '',
            body: typeof o.body === 'string' ? o.body : '',
          }
        }
      }
    }
  } catch {
    // create new
  }

  const def = DEFAULT_TRANSACTIONAL_TEMPLATES[id] ?? { subject: '', body: '' }
  current[id] = { ...def, ...current[id], subject, body: htmlBody }

  const value = { ...current } as Record<string, unknown>

  try {
    const list = await pb.collection('app_settings').getFullList<{ id: string }>({
      filter: `key="${TRANSACTIONAL_APP_SETTINGS_KEY}"`,
    })
    if (list.length > 0) {
      await pb.collection('app_settings').update(list[0].id, { value })
    } else {
      await pb.collection('app_settings').create({ key: TRANSACTIONAL_APP_SETTINGS_KEY, value })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('collection') || msg.includes('404') || msg.includes('not found')) {
      throw createError({
        statusCode: 503,
        message: 'app_settings collection missing. Run: node scripts/create-collections.mjs',
      })
    }
    throw createError({ statusCode: 500, message: msg })
  }

  return { ok: true }
})
