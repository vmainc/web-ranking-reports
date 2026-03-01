import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'

const HONEYPOT_KEY = 'companyFax'
const MIN_SUBMIT_MS = 1500
const RATE = new Map<string, { n: number; t: number }>()
const RATE_WINDOW_MS = 60000
const RATE_MAX = 10

function getIp(event: { headers: { get: (n: string) => string | null }; node?: { req?: { socket?: { remoteAddress?: string } } } }): string {
  const x = event.headers.get('x-forwarded-for')
  if (x) return x.split(',')[0].trim()
  const cf = event.headers.get('cf-connecting-ip')
  if (cf) return cf
  const addr = event.node?.req?.socket?.remoteAddress
  if (addr) return addr
  return 'unknown'
}

function rateLimit(ip: string, formId: string): boolean {
  const key = `${ip}:${formId}`
  const now = Date.now()
  let e = RATE.get(key)
  if (!e) {
    e = { n: 1, t: now + RATE_WINDOW_MS }
    RATE.set(key, e)
    return true
  }
  if (now > e.t) {
    e.n = 1
    e.t = now + RATE_WINDOW_MS
    return true
  }
  e.n++
  return e.n <= RATE_MAX
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const formId = getRouterParam(event, 'id')
  if (!formId) throw createError({ statusCode: 400, message: 'Form id required' })
  const body = (await readBody(event).catch(() => ({}))) as { payload?: Record<string, unknown>; _startedAt?: number }
  const payload = body?.payload && typeof body.payload === 'object' ? body.payload : {}
  const startedAt = typeof body._startedAt === 'number' ? body._startedAt : 0
  if (payload[HONEYPOT_KEY]) return { success: true, message: 'Thank you!' }
  if (startedAt && Date.now() - startedAt < MIN_SUBMIT_MS) return { success: true, message: 'Thank you!' }
  const ip = getIp(event)
  if (!rateLimit(ip, formId)) throw createError({ statusCode: 429, message: 'Too many submissions. Try again later.' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const form = await pb.collection('lead_forms').getOne(formId)
  const rec = form as { status?: string; fields_json?: Array<{ key: string; required?: boolean }>; settings_json?: { successMessage?: string; redirectUrl?: string } }
  if (rec.status !== 'published') throw createError({ statusCode: 404, message: 'Form not found' })
  const fields = (rec.fields_json || []) as Array<{ key: string; required?: boolean }>
  for (const f of fields) {
    if (f.required) {
      const v = payload[f.key]
      if (v === undefined || v === null || String(v).trim() === '') throw createError({ statusCode: 400, message: `Field "${f.key}" is required` })
    }
  }
  const leadName = (payload.lead_name ?? payload.name ?? payload.fullName ?? '') as string
  const leadEmail = (payload.lead_email ?? payload.email ?? '') as string
  const leadPhone = (payload.lead_phone ?? payload.phone ?? '') as string
  const leadWebsite = (payload.lead_website ?? payload.website ?? payload.url ?? '') as string
  const submission = await pb.collection('lead_submissions').create({
    form: formId,
    submitted_at: new Date().toISOString(),
    lead_name: leadName || null,
    lead_email: leadEmail || null,
    lead_phone: leadPhone || null,
    lead_website: leadWebsite || null,
    payload_json: payload,
    status: 'new',
  })
  return {
    success: true,
    message: rec.settings_json?.successMessage ?? 'Thank you!',
    redirectUrl: rec.settings_json?.redirectUrl ?? '',
    submissionId: submission.id,
  }
})
