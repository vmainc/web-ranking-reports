/**
 * SEOptimer embed webhook. Configure in SEOptimer → Embedding → Webhook.
 * POST body includes `key` (must match the value saved in the user’s account) plus lead fields.
 * @see https://www.seoptimer.com/blog/webhook-guide
 */
import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import {
  constantTimeEqualString,
  mapSeoptimerPayload,
  pbFilterString,
  redactSeoptimerPayload,
  strField,
} from '~/server/utils/seoptimerServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  let body: Record<string, unknown>
  try {
    const raw = await readBody(event)
    body = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  } catch {
    body = {}
  }

  const key = strField(body.key)
  if (!key) throw createError({ statusCode: 401, message: 'Invalid key' })

  const pb = getAdminPb()
  await adminAuth(pb)

  const esc = pbFilterString(key)
  let ownerId: string
  try {
    const row = await pb.collection('users').getFirstListItem<{ id: string; seoptimer_webhook_key?: string }>(
      `seoptimer_webhook_key != "" && seoptimer_webhook_key = "${esc}"`,
    )
    const stored = row.seoptimer_webhook_key ?? ''
    if (!constantTimeEqualString(key, stored)) throw new Error('mismatch')
    ownerId = row.id
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid key' })
  }

  const mapped = mapSeoptimerPayload(body)
  const payload_json = redactSeoptimerPayload(body)

  const record = await pb.collection('seoptimer_leads').create({
    user: ownerId,
    name: mapped.name,
    email: mapped.email,
    phone: mapped.phone,
    website: mapped.website,
    audit_url: mapped.audit_url,
    pdf_report_url: mapped.pdf_report_url,
    payload_json,
    received_at: new Date().toISOString(),
  })

  setResponseStatus(event, 200)
  return { ok: true, id: record.id }
})
