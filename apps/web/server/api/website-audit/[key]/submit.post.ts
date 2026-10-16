import { getMethod, getRouterParam, readBody } from 'h3'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { applyPublicCors } from '~/server/utils/publicCors'
import { turnstileConfigured, verifyTurnstileToken } from '~/server/utils/turnstile'
import {
  createWebsiteAuditLead,
  getWebsiteAuditFormSettings,
  normalizeWebsiteUrl,
  reportUrlForToken,
  resolveOwnerIdByPublicKey,
  scheduleWebsiteAuditProcessing,
} from '~/server/utils/websiteAuditForm'

const HONEYPOT_KEY = 'companyFax'
const MIN_SUBMIT_MS = 1500
const RATE = new Map<string, { n: number; t: number }>()
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 8

function getIp(event: {
  headers: { get: (n: string) => string | null }
  node?: { req?: { socket?: { remoteAddress?: string } } }
}): string {
  const x = event.headers.get('x-forwarded-for')
  if (x) return x.split(',')[0].trim()
  const cf = event.headers.get('cf-connecting-ip')
  if (cf) return cf
  return event.node?.req?.socket?.remoteAddress || 'unknown'
}

function rateLimit(ip: string, key: string): boolean {
  const mapKey = `${ip}:${key}`
  const now = Date.now()
  let e = RATE.get(mapKey)
  if (!e) {
    RATE.set(mapKey, { n: 1, t: now + RATE_WINDOW_MS })
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

/** Public: create CRM lead, start audit, email report when ready. */
export default defineEventHandler(async (event) => {
  applyPublicCors(event)
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const key = getRouterParam(event, 'key')
  if (!key) throw createError({ statusCode: 400, message: 'Embed key required' })

  const body = (await readBody(event).catch(() => ({}))) as {
    name?: string
    email?: string
    phone?: string
    website?: string
    _startedAt?: number
    turnstileToken?: string
    companyFax?: string
  }

  if (body.companyFax || (body as Record<string, unknown>)[HONEYPOT_KEY]) {
    return { success: true, message: 'Thank you!' }
  }
  const startedAt = typeof body._startedAt === 'number' ? body._startedAt : 0
  if (startedAt && Date.now() - startedAt < MIN_SUBMIT_MS) {
    return { success: true, message: 'Thank you!' }
  }

  const ip = getIp(event)
  if (!rateLimit(ip, key)) {
    throw createError({ statusCode: 429, message: 'Too many submissions. Try again later.' })
  }

  const config = useRuntimeConfig()
  const turnstileSecret = (config.turnstileSecretKey as string) || process.env.TURNSTILE_SECRET_KEY || ''
  if (turnstileConfigured(turnstileSecret)) {
    const check = await verifyTurnstileToken(body.turnstileToken ?? '', turnstileSecret, ip)
    if (!check.ok) throw createError({ statusCode: 400, message: check.error || 'Security check failed.' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  const ownerId = await resolveOwnerIdByPublicKey(pb, key)
  if (!ownerId) throw createError({ statusCode: 404, message: 'Form not found' })

  const settings = await getWebsiteAuditFormSettings(pb, ownerId)
  if (settings.publicKey !== key || !settings.enabled) {
    throw createError({ statusCode: 404, message: 'Form not found' })
  }

  const website = normalizeWebsiteUrl(String(body.website || ''))
  if (!website) throw createError({ statusCode: 400, message: 'Website is required.' })
  const email = String(body.email || '').trim()
  if (!email || !email.includes('@')) throw createError({ statusCode: 400, message: 'Email is required.' })
  const name = String(body.name || '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'Name is required.' })
  const phone = settings.collectPhone ? String(body.phone || '').trim() || null : null

  const lead = await createWebsiteAuditLead(pb, ownerId, {
    name,
    email,
    phone,
    website,
    payload: { name, email, phone, website, source: 'embed' },
  })

  scheduleWebsiteAuditProcessing(pb, lead.id)

  return {
    success: true,
    message: settings.successMessage,
    reportToken: lead.public_token,
    reportUrl: reportUrlForToken(lead.public_token),
  }
})
