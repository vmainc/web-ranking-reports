/**
 * Whois + DNS fetch with in-memory cache. Used by site domain-info and (optionally) admin.
 */
import { resolve4, resolve6, resolveSoa } from 'node:dns'
import { promisify } from 'node:util'

const resolve4Async = promisify(resolve4)
const resolve6Async = promisify(resolve6)
const resolveSoaAsync = promisify(resolveSoa)

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface WhoisSafe {
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
}

export interface DomainInfoResult {
  whois: WhoisSafe
  dns: { a: string[]; aaaa: string[]; soa?: string }
  fetchedAt: string
}

const cache = new Map<string, { data: DomainInfoResult; fetchedAt: number }>()

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

function normalizeWhois(
  payload: Record<string, unknown>,
  domainFallback: string
): WhoisSafe & { raw: Record<string, unknown> } {
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

async function fetchWhoisAndDns(domain: string, apiKey: string): Promise<DomainInfoResult> {
  const res = await fetch(`https://api.apilayer.com/whois/query?domain=${encodeURIComponent(domain)}`, {
    headers: { apikey: apiKey },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Whois API: ${res.status} ${text.slice(0, 150)}`)
  }
  const whoisData = (await res.json()) as Record<string, unknown>
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
    // optional
  }

  const { raw: _raw, ...whoisSafe } = normalized
  const fetchedAt = new Date().toISOString()
  return { whois: whoisSafe, dns, fetchedAt }
}

export function normalizeDomain(domain: string): string {
  let d = domain.trim().toLowerCase()
  d = d.replace(/^https?:\/\//, '').split('/')[0]
  return d
}

/**
 * Get whois + DNS for a domain. Uses in-memory cache unless forceRefresh is true.
 * Cache TTL is 24 hours.
 */
export async function getDomainInfo(
  domain: string,
  apiKey: string,
  forceRefresh?: boolean
): Promise<DomainInfoResult> {
  const key = normalizeDomain(domain)
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(key)) {
    throw new Error('Invalid domain format')
  }

  if (!forceRefresh) {
    const cached = cache.get(key)
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.data
    }
  }

  const data = await fetchWhoisAndDns(key, apiKey)
  cache.set(key, { data, fetchedAt: Date.now() })
  return data
}
