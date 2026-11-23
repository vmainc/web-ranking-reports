/**
 * Domain / URL normalization and host matching for keyword rank tracking.
 *
 * Site model: each site has one `domain` representing the tracked property.
 * Default match mode includes www equivalence and subdomains of that host
 * (blog.example.com matches example.com), but never parent/sibling hosts
 * (example.wordpress.com does NOT match wordpress.com).
 */

export type HostMatchMode = 'exact_hostname' | 'www_equivalent' | 'include_subdomains'

export interface HostMatchOptions {
  /** Default: include_subdomains (www + apex + child hosts of tracked domain). */
  mode?: HostMatchMode
}

/**
 * Normalize a site domain or URL into a bare lowercase hostname suitable for matching.
 * Strips protocol, credentials, path, query, fragment, trailing dots, and leading www.
 * Attempts punycode via URL parsing when possible.
 */
export function normalizeRankingHostname(input: string): string {
  let raw = String(input || '').trim()
  if (!raw) return ''

  // Bare host or host/path without scheme — give URL a scheme so URL() parses.
  if (!/^https?:\/\//i.test(raw) && !raw.includes('://')) {
    raw = `https://${raw}`
  }

  try {
    const u = new URL(raw)
    let host = (u.hostname || '').trim().toLowerCase()
    // Strip trailing dots (DNS absolute form) and brackets from IPv6.
    host = host.replace(/\.+$/, '').replace(/^\[|\]$/g, '')
    if (host.startsWith('www.')) host = host.slice(4)
    // Drop default-looking ports already excluded by hostname; reject empty.
    return host
  } catch {
    // Fallback for odd inputs URL() rejects.
    let d = String(input || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//i, '')
      .replace(/^\/\//, '')
      .split('/')[0]
      ?.split('?')[0]
      ?.split('#')[0]
      ?.split(':')[0]
      ?.replace(/\.+$/, '')
      .trim() || ''
    if (d.startsWith('www.')) d = d.slice(4)
    return d
  }
}

/** Extract hostname from a SERP result URL (keeps www stripped via normalize). */
export function hostnameFromUrl(url: string): string | null {
  const host = normalizeRankingHostname(url)
  return host || null
}

/**
 * Does `candidateHostOrUrl` belong to the tracked site domain?
 *
 * - exact_hostname: identical host only (after normalize, so www already stripped → apex only)
 * - www_equivalent: same as exact after www strip (default normalize already strips www)
 * - include_subdomains: candidate === tracked OR candidate ends with `.${tracked}`
 */
export function hostsMatch(
  candidateHostOrUrl: string,
  trackedDomain: string,
  options?: HostMatchOptions,
): boolean {
  const mode = options?.mode ?? 'include_subdomains'
  const tracked = normalizeRankingHostname(trackedDomain)
  const candidate = normalizeRankingHostname(candidateHostOrUrl)
  if (!tracked || !candidate) return false

  if (mode === 'exact_hostname' || mode === 'www_equivalent') {
    return candidate === tracked
  }

  // include_subdomains
  if (candidate === tracked) return true
  return candidate.endsWith(`.${tracked}`)
}

/**
 * Build DataForSEO `target` wildcard for Google Organic Live Advanced.
 *
 * Per DataForSEO docs:
 * - `example.com` → homepage URLs only (WRONG for rank tracking)
 * - `example.com*` → all pages on that host
 * - `*example.com*` → all pages including subdomains
 *
 * We never send bare `example.com` for rank checks.
 */
export function buildDataForSeoTarget(
  domain: string,
  options?: { includeSubdomains?: boolean },
): string {
  const host = normalizeRankingHostname(domain)
  if (!host) return ''
  const includeSubdomains = options?.includeSubdomains !== false
  return includeSubdomains ? `*${host}*` : `${host}*`
}

type OrganicSerpItem = {
  type?: string
  rank_group?: number
  rank_absolute?: number
  domain?: string
  url?: string
  breadcrumb?: string
  website_name?: string
  title?: string
  description?: string
}

/**
 * Host hints for one organic row. DataForSEO often wraps results in google.com/goto URLs;
 * the destination host usually appears in breadcrumb / website_name.
 */
export function organicSerpItemHostHints(item: OrganicSerpItem): string[] {
  const candidates = [item.url, item.breadcrumb, item.website_name, item.domain]
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of candidates) {
    const s = typeof raw === 'string' ? raw.trim() : ''
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

export function serpItemMatchesTrackedDomain(
  item: OrganicSerpItem,
  trackedDomain: string,
  options?: HostMatchOptions,
): { matched: boolean; matchHost: string } {
  for (const hint of organicSerpItemHostHints(item)) {
    if (hostsMatch(hint, trackedDomain, options)) {
      return { matched: true, matchHost: normalizeRankingHostname(hint) }
    }
  }
  return { matched: false, matchHost: '' }
}

/**
 * Pick organic SERP items whose URL/domain belongs to the tracked site,
 * sorted best-first by organic rank_group (then rank_absolute).
 */
export function selectOrganicDomainMatches<T extends OrganicSerpItem>(
  items: T[],
  trackedDomain: string,
  options?: HostMatchOptions,
): Array<
  T & {
    matchHost: string
    organicPosition: number
  }
> {
  const matches: Array<T & { matchHost: string; organicPosition: number }> = []
  for (const item of items) {
    if (item.type !== 'organic') continue
    const { matched, matchHost } = serpItemMatchesTrackedDomain(item, trackedDomain, options)
    if (!matched) continue
    const organicPosition =
      typeof item.rank_group === 'number' && item.rank_group > 0
        ? item.rank_group
        : typeof item.rank_absolute === 'number' && item.rank_absolute > 0
          ? item.rank_absolute
          : 0
    if (organicPosition <= 0) continue
    matches.push({
      ...item,
      matchHost,
      organicPosition,
    })
  }
  matches.sort((a, b) => {
    if (a.organicPosition !== b.organicPosition) return a.organicPosition - b.organicPosition
    const aa = a.rank_absolute ?? Number.POSITIVE_INFINITY
    const ba = b.rank_absolute ?? Number.POSITIVE_INFINITY
    return aa - ba
  })
  return matches
}
