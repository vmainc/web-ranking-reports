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

export type GraphPage<T> = { data?: T[]; paging?: { next?: string } }

/** Follow `paging.next` until exhausted or `maxItems`. Does not stop after the first response page. */
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
  while (path && out.length < max) {
    const page = await opts.fetchPage(path, query)
    out.push(...(page.data || []))
    path = page.paging?.next || null
    query = undefined
  }
  return out.slice(0, max)
}

export async function listMetaManagedPages(userAccessToken: string): Promise<MetaManagedPage[]> {
  return walkGraphPages<MetaManagedPage>({
    fetchPage: (path, query) =>
      metaGraphFetch<GraphPage<MetaManagedPage>>({
        path,
        accessToken: userAccessToken,
        query,
      }),
    firstPath: 'me/accounts',
    firstQuery: {
      fields: 'id,name,username,link,access_token,followers_count,fan_count,tasks',
      limit: '100',
    },
  })
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
