import { getUserIdFromRequest, getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { getWorkspaceContext, escPbFilterId } from '~/server/utils/workspace'
import { ensureUserSubscription } from '~/server/services/subscriptions'
import {
  getDomainInfo,
  daysRemainingFromWhoisExpiresAt,
  canonicalRegistrableDomain,
  domainFromGscSiteUrl,
} from '~/server/utils/domainInfo'

export interface AgencyDomainSiteRef {
  id: string
  name: string
}

export interface AgencyDomainRow {
  domain: string
  sites: AgencyDomainSiteRef[]
  expirationDate: string | null
  daysRemaining: number | null
  domainAgeYears: number | null
  registrar: string | null
  updatedAt: string | null
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  whoisError?: string
}

/** List workspace sites (same visibility as GET /api/workspace/sites). */
async function listWorkspaceSites(
  pb: ReturnType<typeof getAdminPb>,
  userId: string,
  ctx: Awaited<ReturnType<typeof getWorkspaceContext>>,
): Promise<Array<{ id: string; name: string; domain: string }>> {
  if (ctx.role === 'owner') {
    return await pb.collection('sites').getFullList<{ id: string; name: string; domain: string }>({
      filter: `user = "${escPbFilterId(userId)}"`,
      sort: '-created',
    })
  }
  if (ctx.role === 'member') {
    return await pb.collection('sites').getFullList<{ id: string; name: string; domain: string }>({
      filter: `user = "${escPbFilterId(ctx.ownerId)}"`,
      sort: '-created',
    })
  }
  let access: { site: string }[] = []
  try {
    access = await pb.collection('client_site_access').getFullList<{ site: string }>({
      filter: `client = "${escPbFilterId(userId)}"`,
      batch: 200,
    })
  } catch {
    return []
  }
  const ids = [...new Set(access.map((a) => a.site).filter(Boolean))]
  const sites: Array<{ id: string; name: string; domain: string }> = []
  for (const id of ids) {
    try {
      const s = await pb.collection('sites').getOne<{ id: string; name: string; domain: string }>(id)
      sites.push(s)
    } catch {
      // skip
    }
  }
  sites.sort((a, b) => (a.name || a.domain).localeCompare(b.name || b.domain))
  return sites
}

function rowStatus(daysRemaining: number | null): AgencyDomainRow['status'] {
  if (daysRemaining == null) return 'unknown'
  if (daysRemaining < 0) return 'critical'
  if (daysRemaining < 30) return 'critical'
  if (daysRemaining < 90) return 'warning'
  return 'healthy'
}

/** WHOIS expiry string (often MM/DD/YYYY) → YYYY-MM-DD for API consumers. */
function whoisExpiresAtToIsoDate(expiresAt: string | null): string | null {
  if (expiresAt == null || !String(expiresAt).trim()) return null
  const s = String(expiresAt).trim()
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (m) {
    const month = parseInt(m[1], 10) - 1
    const day = parseInt(m[2], 10)
    const year = parseInt(m[3], 10)
    const d = new Date(year, month, day)
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await ensureUserSubscription(pb, userId).catch(() => undefined)

  const ctx = await getWorkspaceContext(pb, userId)
  const sites = await listWorkspaceSites(pb, userId, ctx)

  const siteIds = sites.map((s) => s.id)
  const integrationsBySite = new Map<string, Array<{ provider: string; config_json?: Record<string, unknown> }>>()
  if (siteIds.length) {
    const filter = siteIds.map((id) => `site = "${escPbFilterId(id)}"`).join(' || ')
    const rows = await pb
      .collection('integrations')
      .getFullList<{ site: string; provider: string; config_json?: Record<string, unknown> }>({
        filter: `(${filter})`,
      })
    for (const r of rows) {
      const sid = typeof r.site === 'string' ? r.site : ''
      if (!sid) continue
      const arr = integrationsBySite.get(sid) ?? []
      arr.push({ provider: r.provider, config_json: r.config_json })
      integrationsBySite.set(sid, arr)
    }
  }

  /** canonical domain -> site refs (dedupe by site id) */
  const byDomain = new Map<string, AgencyDomainSiteRef[]>()

  function addCanonical(canonical: string, site: { id: string; name: string }) {
    if (!canonical || !canonical.includes('.')) return
    let list = byDomain.get(canonical)
    if (!list) {
      list = []
      byDomain.set(canonical, list)
    }
    if (!list.some((x) => x.id === site.id)) {
      list.push({ id: site.id, name: site.name || site.id.slice(0, 8) })
    }
  }

  for (const s of sites) {
    const siteRef = { id: s.id, name: s.name || s.domain }
    addCanonical(canonicalRegistrableDomain(s.domain), siteRef)

    const integs = integrationsBySite.get(s.id) ?? []
    for (const i of integs) {
      if (i.provider !== 'google_analytics' && i.provider !== 'google_search_console') continue
      const gscUrl = i.config_json?.gsc_site_url
      if (typeof gscUrl === 'string') {
        const fromGsc = domainFromGscSiteUrl(gscUrl)
        if (fromGsc) addCanonical(fromGsc, siteRef)
      }
    }
  }

  const query = getQuery(event)
  const forceRefresh = query.refresh === '1' || query.refresh === 'true'

  let apiKey = ''
  let whoisConfigured = false
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value: { api_key?: string } }>(
      'key="apilayer_whois"',
    )
    apiKey = row?.value?.api_key?.trim() ?? ''
    whoisConfigured = !!apiKey
  } catch {
    whoisConfigured = false
  }

  const canonicalKeys = [...byDomain.keys()].sort((a, b) => a.localeCompare(b))
  const domains: AgencyDomainRow[] = []

  for (const domain of canonicalKeys) {
    const siteRefs = byDomain.get(domain) ?? []
    if (!whoisConfigured) {
      domains.push({
        domain,
        sites: siteRefs,
        expirationDate: null,
        daysRemaining: null,
        domainAgeYears: null,
        registrar: null,
        updatedAt: null,
        status: 'unknown',
      })
      continue
    }

    try {
      const info = await getDomainInfo(domain, apiKey, forceRefresh)
      const days = daysRemainingFromWhoisExpiresAt(info.whois.expiresAt)
      const expirationDate = whoisExpiresAtToIsoDate(info.whois.expiresAt)
      domains.push({
        domain,
        sites: siteRefs,
        expirationDate,
        daysRemaining: days,
        domainAgeYears: info.whois.domainAgeYears,
        registrar: info.whois.registrar,
        updatedAt: info.fetchedAt,
        status: rowStatus(days),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lookup failed'
      domains.push({
        domain,
        sites: siteRefs,
        expirationDate: null,
        daysRemaining: null,
        domainAgeYears: null,
        registrar: null,
        updatedAt: null,
        status: 'unknown',
        whoisError: msg,
      })
    }
  }

  const withAge = domains.filter((d) => d.domainAgeYears != null && Number.isFinite(d.domainAgeYears))
  const avgAge =
    withAge.length > 0 ? withAge.reduce((a, d) => a + (d.domainAgeYears as number), 0) / withAge.length : null

  const expiring30 = domains.filter(
    (d) => d.daysRemaining != null && d.daysRemaining >= 0 && d.daysRemaining <= 30,
  ).length
  /** Registrations renewing in 31–90 days (non-overlapping with the 30-day card). */
  const expiring90Band = domains.filter(
    (d) => d.daysRemaining != null && d.daysRemaining > 30 && d.daysRemaining <= 90,
  ).length

  return {
    whoisConfigured,
    domains,
    stats: {
      total: domains.length,
      expiring30,
      expiring90: expiring90Band,
      averageDomainAgeYears: avgAge,
    },
  }
})
