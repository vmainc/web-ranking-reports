import { getMetaConfig, metaGraphBaseUrl } from '~/server/utils/metaConfig'
import { SocialErrorCode, SocialServiceError } from '~/server/services/social/errors'

export type MetaGraphResponse<T> = {
  data?: T
  paging?: { next?: string; previous?: string }
  error?: {
    message?: string
    type?: string
    code?: number
    error_subcode?: number
  }
}

function redactMetaUrl(url: string): string {
  try {
    const u = new URL(url)
    u.searchParams.delete('access_token')
    u.searchParams.delete('client_secret')
    u.searchParams.delete('fb_exchange_token')
    u.searchParams.delete('code')
    return u.toString()
  } catch {
    return '[invalid-url]'
  }
}

export function classifyMetaGraphError(err: {
  message?: string
  type?: string
  code?: number
  error_subcode?: number
}): SocialServiceError {
  const code = err.code
  const sub = err.error_subcode
  const msg = (err.message || '').toLowerCase()

  if (code === 190 || code === 102 || /session has expired|access token/i.test(msg)) {
    return new SocialServiceError({
      code: SocialErrorCode.META_AUTH_EXPIRED,
      message: 'Meta access token expired or invalid',
      httpStatus: 401,
    })
  }
  if (code === 10 || code === 200 || /permission/i.test(msg)) {
    return new SocialServiceError({
      code: SocialErrorCode.META_PERMISSION_MISSING,
      message: 'Meta permission missing',
      httpStatus: 403,
    })
  }
  if (code === 100 && (sub === 33 || /does not exist|unsupported get request/i.test(msg))) {
    return new SocialServiceError({
      code: SocialErrorCode.META_PAGE_ACCESS_REMOVED,
      message: 'Facebook Page is not accessible',
      httpStatus: 404,
    })
  }
  if (code === 4 || code === 17 || code === 32 || /rate limit/i.test(msg)) {
    return new SocialServiceError({
      code: SocialErrorCode.META_RATE_LIMITED,
      message: 'Meta rate limited',
      httpStatus: 429,
    })
  }
  return new SocialServiceError({
    code: SocialErrorCode.META_API_ERROR,
    message: `Meta Graph error code=${code ?? 'unknown'}`,
    httpStatus: 502,
  })
}

export async function metaGraphFetch<T>(opts: {
  path: string
  accessToken: string
  query?: Record<string, string | number | undefined>
  method?: 'GET' | 'POST' | 'DELETE'
}): Promise<T> {
  const cfg = getMetaConfig()
  const url = new URL(opts.path.startsWith('http') ? opts.path : `${metaGraphBaseUrl(cfg.graphVersion)}/${opts.path.replace(/^\//, '')}`)
  if (opts.method !== 'POST') {
    url.searchParams.set('access_token', opts.accessToken)
    for (const [k, v] of Object.entries(opts.query || {})) {
      if (v == null || v === '') continue
      url.searchParams.set(k, String(v))
    }
  }

  const init: RequestInit = { method: opts.method || 'GET' }
  if (opts.method === 'POST') {
    const body = new URLSearchParams()
    body.set('access_token', opts.accessToken)
    for (const [k, v] of Object.entries(opts.query || {})) {
      if (v == null || v === '') continue
      body.set(k, String(v))
    }
    init.headers = { 'Content-Type': 'application/x-www-form-urlencoded' }
    init.body = body.toString()
  }

  let res: Response
  try {
    res = await fetch(url.toString(), init)
  } catch (e) {
    throw new SocialServiceError({
      code: SocialErrorCode.META_API_ERROR,
      message: `Meta Graph network error: ${e instanceof Error ? e.message : 'unknown'}`,
      httpStatus: 502,
    })
  }

  const json = (await res.json().catch(() => ({}))) as MetaGraphResponse<T> & T & { error?: MetaGraphResponse<T>['error'] }
  if (!res.ok || json.error) {
    const err = json.error || { message: `HTTP ${res.status}`, code: res.status }
    console.warn('[meta.graph.error]', {
      status: res.status,
      path: redactMetaUrl(url.toString()),
      code: err.code,
      subcode: err.error_subcode,
      type: err.type,
    })
    throw classifyMetaGraphError(err)
  }
  return json as T
}

export async function exchangeMetaCodeForToken(code: string): Promise<{
  accessToken: string
  tokenType?: string
  expiresIn?: number
}> {
  const cfg = getMetaConfig()
  const url = new URL(`${metaGraphBaseUrl(cfg.graphVersion)}/oauth/access_token`)
  url.searchParams.set('client_id', cfg.appId)
  url.searchParams.set('client_secret', cfg.appSecret)
  url.searchParams.set('redirect_uri', cfg.redirectUri)
  url.searchParams.set('code', code)
  const res = await fetch(url.toString())
  const json = (await res.json()) as {
    access_token?: string
    token_type?: string
    expires_in?: number
    error?: { message?: string; code?: number; type?: string; error_subcode?: number }
  }
  if (!res.ok || !json.access_token) {
    throw classifyMetaGraphError(json.error || { message: 'token exchange failed', code: res.status })
  }
  return {
    accessToken: json.access_token,
    tokenType: json.token_type,
    expiresIn: json.expires_in,
  }
}

export async function exchangeMetaLongLivedToken(shortLived: string): Promise<{
  accessToken: string
  expiresIn?: number
}> {
  const cfg = getMetaConfig()
  const url = new URL(`${metaGraphBaseUrl(cfg.graphVersion)}/oauth/access_token`)
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', cfg.appId)
  url.searchParams.set('client_secret', cfg.appSecret)
  url.searchParams.set('fb_exchange_token', shortLived)
  const res = await fetch(url.toString())
  const json = (await res.json()) as {
    access_token?: string
    expires_in?: number
    error?: { message?: string; code?: number; type?: string; error_subcode?: number }
  }
  if (!res.ok || !json.access_token) {
    throw classifyMetaGraphError(json.error || { message: 'long-lived token exchange failed', code: res.status })
  }
  return { accessToken: json.access_token, expiresIn: json.expires_in }
}

export async function fetchMetaMe(accessToken: string): Promise<{ id: string; name?: string }> {
  const me = await metaGraphFetch<{ id: string; name?: string }>({
    path: 'me',
    accessToken,
    query: { fields: 'id,name' },
  })
  return { id: me.id, name: me.name }
}

export type MetaManagedPage = {
  id: string
  name: string
  username?: string
  link?: string
  access_token?: string
  followers_count?: number
  fan_count?: number
  tasks?: string[]
}

export type GraphPage<T> = {
  data?: T[]
  paging?: { next?: string; cursors?: { after?: string; before?: string } }
}

/** Follow `paging.next` (or `cursors.after`) until exhausted or `maxItems`. Does not stop after the first response page. */
export async function walkGraphPages<T>(opts: {
  fetchPage: (path: string, query?: Record<string, string>) => Promise<GraphPage<T>>
  firstPath: string
  firstQuery?: Record<string, string>
  maxItems?: number
}): Promise<T[]> {
  const out: T[] = []
  const max = opts.maxItems ?? 1000
  let path: string | null = opts.firstPath
  let query = opts.firstQuery
  const seenCursors = new Set<string>()
  while (path && out.length < max) {
    const page = await opts.fetchPage(path, query)
    const rows = page.data || []
    out.push(...rows)
    const nextUrl = page.paging?.next || ''
    const after = page.paging?.cursors?.after || ''
    if (nextUrl) {
      path = nextUrl
      query = undefined
      continue
    }
    if (after && rows.length > 0 && !seenCursors.has(after)) {
      seenCursors.add(after)
      path = opts.firstPath
      query = { ...(opts.firstQuery || {}), after }
      continue
    }
    path = null
  }
  return out.slice(0, max)
}

const MANAGED_PAGE_FIELDS = 'id,name,username,link,access_token,followers_count,fan_count,tasks'
const MANAGED_PAGE_LIMIT = '100'
const MANAGED_PAGE_MAX = 5000

function fetchGraphPage<T>(accessToken: string) {
  return (path: string, query?: Record<string, string>) =>
    metaGraphFetch<GraphPage<T>>({
      path,
      accessToken,
      query,
    })
}

async function listMetaPagesQuiet(accessToken: string, firstPath: string): Promise<MetaManagedPage[]> {
  try {
    return await walkGraphPages<MetaManagedPage>({
      fetchPage: fetchGraphPage<MetaManagedPage>(accessToken),
      firstPath,
      firstQuery: { fields: MANAGED_PAGE_FIELDS, limit: MANAGED_PAGE_LIMIT },
      maxItems: MANAGED_PAGE_MAX,
    })
  } catch {
    return []
  }
}

/** Prefer rows that include a Page access token (required for Insights). */
export function mergeMetaManagedPages(groups: MetaManagedPage[][]): MetaManagedPage[] {
  const byId = new Map<string, MetaManagedPage>()
  for (const group of groups) {
    for (const page of group) {
      if (!page?.id) continue
      const existing = byId.get(page.id)
      if (!existing || (!existing.access_token && page.access_token)) {
        byId.set(page.id, page)
      }
    }
  }
  return [...byId.values()]
}

export async function listMetaGrantedPermissionNames(accessToken: string): Promise<string[]> {
  try {
    const res = await metaGraphFetch<{ data?: Array<{ permission?: string; status?: string }> }>({
      path: 'me/permissions',
      accessToken,
    })
    return (res.data || [])
      .filter((row) => row.status === 'granted' && row.permission)
      .map((row) => String(row.permission))
  } catch {
    return []
  }
}

/**
 * Pages the user can act on: /me/accounts plus Business-owned and client Pages.
 * Graph v17+ omits Business-linked Pages from /me/accounts without business_management.
 * `/me/accounts` errors (expired token) propagate; Business edges fail closed to [].
 */
export async function listMetaManagedPages(userAccessToken: string): Promise<MetaManagedPage[]> {
  const fromAccounts = await walkGraphPages<MetaManagedPage>({
    fetchPage: fetchGraphPage<MetaManagedPage>(userAccessToken),
    firstPath: 'me/accounts',
    firstQuery: { fields: MANAGED_PAGE_FIELDS, limit: MANAGED_PAGE_LIMIT },
    maxItems: MANAGED_PAGE_MAX,
  })
  const groups: MetaManagedPage[][] = [fromAccounts]
  try {
    const businesses = await walkGraphPages<{ id: string }>({
      fetchPage: fetchGraphPage<{ id: string }>(userAccessToken),
      firstPath: 'me/businesses',
      firstQuery: { fields: 'id', limit: MANAGED_PAGE_LIMIT },
      maxItems: 200,
    })
    for (const business of businesses) {
      if (!business.id) continue
      groups.push(await listMetaPagesQuiet(userAccessToken, `${business.id}/owned_pages`))
      groups.push(await listMetaPagesQuiet(userAccessToken, `${business.id}/client_pages`))
    }
  } catch {
    // No business_management, or the user has no Business Manager — /me/accounts only.
  }
  return mergeMetaManagedPages(groups)
}

export async function revokeMetaUserPermissions(accessToken: string): Promise<void> {
  try {
    await metaGraphFetch({
      path: 'me/permissions',
      accessToken,
      method: 'DELETE',
    })
  } catch {
    // best-effort revoke
  }
}

/** Meta ad account as returned by /me/adaccounts and Business owned/client edges. */
export type MetaAdAccount = {
  id: string
  account_id: string
  name: string
  currency?: string
  account_status?: number
  business?: { id?: string; name?: string }
}

const AD_ACCOUNT_FIELDS = 'account_id,id,name,currency,account_status,business{id,name}'
const AD_ACCOUNT_LIMIT = '100'
const AD_ACCOUNT_MAX = 2000

/** Normalize to numeric account id (no `act_` prefix). */
export function normalizeMetaAdAccountId(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^act_/i, '')
}

export function metaAdAccountActId(accountId: string): string {
  const id = normalizeMetaAdAccountId(accountId)
  return id ? `act_${id}` : ''
}

export function mergeMetaAdAccounts(groups: MetaAdAccount[][]): MetaAdAccount[] {
  const byId = new Map<string, MetaAdAccount>()
  for (const group of groups) {
    for (const row of group) {
      const accountId = normalizeMetaAdAccountId(row.account_id || row.id)
      if (!accountId) continue
      const normalized: MetaAdAccount = {
        ...row,
        account_id: accountId,
        id: row.id?.startsWith('act_') ? row.id : `act_${accountId}`,
        name: row.name || accountId,
      }
      if (!byId.has(accountId)) byId.set(accountId, normalized)
    }
  }
  return [...byId.values()]
}

async function listMetaAdAccountsQuiet(accessToken: string, firstPath: string): Promise<MetaAdAccount[]> {
  try {
    return await walkGraphPages<MetaAdAccount>({
      fetchPage: fetchGraphPage<MetaAdAccount>(accessToken),
      firstPath,
      firstQuery: { fields: AD_ACCOUNT_FIELDS, limit: AD_ACCOUNT_LIMIT },
      maxItems: AD_ACCOUNT_MAX,
    })
  } catch {
    return []
  }
}

/**
 * Ad accounts the user can read: /me/adaccounts plus Business owned/client ad accounts.
 * Requires ads_read. Business edges fail closed to [] when business_management is missing.
 */
export async function listMetaAdAccounts(userAccessToken: string): Promise<MetaAdAccount[]> {
  const fromMe = await walkGraphPages<MetaAdAccount>({
    fetchPage: fetchGraphPage<MetaAdAccount>(userAccessToken),
    firstPath: 'me/adaccounts',
    firstQuery: { fields: AD_ACCOUNT_FIELDS, limit: AD_ACCOUNT_LIMIT },
    maxItems: AD_ACCOUNT_MAX,
  })
  const groups: MetaAdAccount[][] = [fromMe]
  try {
    const businesses = await walkGraphPages<{ id: string }>({
      fetchPage: fetchGraphPage<{ id: string }>(userAccessToken),
      firstPath: 'me/businesses',
      firstQuery: { fields: 'id', limit: MANAGED_PAGE_LIMIT },
      maxItems: 200,
    })
    for (const business of businesses) {
      if (!business.id) continue
      groups.push(await listMetaAdAccountsQuiet(userAccessToken, `${business.id}/owned_ad_accounts`))
      groups.push(await listMetaAdAccountsQuiet(userAccessToken, `${business.id}/client_ad_accounts`))
    }
  } catch {
    // No business_management, or no Business Manager — /me/adaccounts only.
  }
  return mergeMetaAdAccounts(groups)
}

export type MetaAdsInsightRow = {
  campaign_id?: string
  campaign_name?: string
  date_start?: string
  date_stop?: string
  spend?: string
  impressions?: string
  clicks?: string
  ctr?: string
  cpc?: string
  actions?: Array<{ action_type?: string; value?: string }>
}

/** Sum Meta `actions` values that look like conversions (leads + purchases). */
export function sumMetaAdsConversions(actions: Array<{ action_type?: string; value?: string }> | undefined): number {
  if (!actions?.length) return 0
  let total = 0
  for (const a of actions) {
    const t = (a.action_type || '').toLowerCase()
    if (
      t === 'lead' ||
      t === 'purchase' ||
      t === 'omni_purchase' ||
      t === 'omni_lead' ||
      t === 'complete_registration' ||
      t.endsWith('_lead') ||
      t.endsWith('_purchase') ||
      t.includes('offsite_conversion.fb_pixel_lead') ||
      t.includes('offsite_conversion.fb_pixel_purchase')
    ) {
      total += Number(a.value || 0) || 0
    }
  }
  return total
}

export async function fetchMetaAdAccountInsights(opts: {
  accessToken: string
  accountId: string
  since: string
  until: string
  level?: 'account' | 'campaign'
  timeIncrement?: number | 'all_days'
}): Promise<MetaAdsInsightRow[]> {
  const actId = metaAdAccountActId(opts.accountId)
  if (!actId) {
    throw new SocialServiceError({
      code: SocialErrorCode.META_API_ERROR,
      message: 'Invalid Meta ad account id',
      httpStatus: 400,
    })
  }
  const fields =
    opts.level === 'campaign'
      ? 'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions,date_start,date_stop'
      : 'spend,impressions,clicks,ctr,cpc,actions,date_start,date_stop'
  const query: Record<string, string> = {
    fields,
    time_range: JSON.stringify({ since: opts.since, until: opts.until }),
    limit: '500',
  }
  if (opts.level === 'campaign') query.level = 'campaign'
  if (opts.timeIncrement != null) query.time_increment = String(opts.timeIncrement)

  return walkGraphPages<MetaAdsInsightRow>({
    fetchPage: fetchGraphPage<MetaAdsInsightRow>(opts.accessToken),
    firstPath: `${actId}/insights`,
    firstQuery: query,
    maxItems: 5000,
  })
}
