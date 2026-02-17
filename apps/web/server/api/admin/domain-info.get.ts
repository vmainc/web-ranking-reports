import { getAdminPb, adminAuth, getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'
import { resolve4, resolve6, resolveSoa } from 'node:dns'
import { promisify } from 'node:util'

const resolve4Async = promisify(resolve4)
const resolve6Async = promisify(resolve6)
const resolveSoaAsync = promisify(resolveSoa)

function parseWhoisDate(val: unknown): string | null {
  if (val == null) return null
  const s = String(val).trim()
  if (!s) return null
  return s
}

function domainAgeYears(creationDate: string | null): number | null {
  if (!creationDate) return null
  const d = new Date(creationDate)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  return (now.getTime() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
}

/** Format ISO/date string as US MM/DD/YYYY (no time). */
function formatWhoisDateDisplay(iso: string | null): string | null {
  if (!iso || !String(iso).trim()) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const year = d.getFullYear()
  return `${month}/${day}/${year}`
}

/** Normalize whois response from APILayer (or similar) into a consistent shape. */
function normalizeWhois(payload: Record<string, unknown>, domainFallback: string): {
  domain: string
  createdAt: string | null
  updatedAt: string | null
  expiresAt: string | null
  domainAgeYears: number | null
  registrar: string | null
  registrantOrg: string | null
  registrantName: string | null
  registrantCountry: string | null
  nameServers: string[]
  raw: Record<string, unknown>
} {
  const raw = (payload.result as Record<string, unknown>) ?? payload
  const get = (key: string, alt?: string): string | null => {
    const v = raw[key] ?? raw[alt ?? '']
    if (v == null) return null
    const s = String(v).trim()
    return s || null
  }
  const getList = (key: string): string[] => {
    const v = raw[key]
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
    if (typeof v === 'string') return v.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
    return []
  }

  const domain = get('domain', 'domain_name') ?? get('name') ?? domainFallback
  const createdAt = parseWhoisDate(raw.creation_date ?? raw.created ?? raw.creationDate)
  const updatedAt = parseWhoisDate(raw.updated_date ?? raw.updated ?? raw.last_updated)
  const expiresAtRaw = parseWhoisDate(raw.expiration_date ?? raw.expiry_date ?? raw.expires ?? raw.expirationDate)
  const expiresAt = formatWhoisDateDisplay(expiresAtRaw) ?? expiresAtRaw
  const registrar = get('registrar') ?? get('registrar_name')
  const registrantOrg = get('registrant_organization', 'registrant_org') ?? get('registrant_organisation')
  const registrantName = get('registrant_name')
  const registrantCountry = get('registrant_country')
  const nameServers = getList('name_servers')

  return {
    domain,
    createdAt,
    updatedAt,
    expiresAt,
    domainAgeYears: domainAgeYears(createdAt),
    registrar,
    registrantOrg,
    registrantName,
    registrantCountry,
    nameServers,
    raw: raw as Record<string, unknown>,
  }
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

  const query = getQuery(event)
  let domain = (query.domain as string)?.trim()?.toLowerCase()
  if (!domain) throw createError({ statusCode: 400, message: 'domain query required' })
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain)) {
    throw createError({ statusCode: 400, message: 'Invalid domain format' })
  }
  domain = domain.replace(/^https?:\/\//, '').split('/')[0]

  let whoisData: Record<string, unknown> = {}
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value: { api_key?: string } }>('key="apilayer_whois"')
    const apiKey = row?.value?.api_key?.trim()
    if (!apiKey) throw createError({ statusCode: 400, message: 'Whois API key not configured. Add it in the APILayer Whois API section below.' })

    const res = await fetch(`https://api.apilayer.com/whois/query?domain=${encodeURIComponent(domain)}`, {
      headers: { apikey: apiKey },
    })
    if (!res.ok) {
      const text = await res.text()
      throw createError({ statusCode: res.status, message: `Whois API: ${res.status} ${text.slice(0, 150)}` })
    }
    whoisData = (await res.json()) as Record<string, unknown>
  } catch (e) {
    if (e && typeof e === 'object' && 'statusCode' in e) throw e
    throw createError({ statusCode: 500, message: e instanceof Error ? e.message : 'Whois lookup failed' })
  }

  const normalized = normalizeWhois(whoisData, domain)

  let dns: { a: string[]; aaaa: string[]; soa?: string } = { a: [], aaaa: [] }
  try {
    const [a, aaaa, soa] = await Promise.all([
      resolve4Async(domain).catch(() => []),
      resolve6Async(domain).catch(() => []),
      resolveSoaAsync(domain).catch(() => null),
    ])
    dns.a = Array.isArray(a) ? a : []
    dns.aaaa = Array.isArray(aaaa) ? aaaa : []
    const soaRec = Array.isArray(soa) && soa[0] ? soa[0] : soa
    if (soaRec && typeof soaRec === 'object' && 'nsname' in soaRec) dns.soa = (soaRec as { nsname: string }).nsname
  } catch {
    // DNS resolve optional
  }

  const { raw: _raw, ...whoisSafe } = normalized
  return {
    whois: whoisSafe,
    dns,
  }
})
