import { createError } from 'h3'

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4'
const CLOUDFLARE_GRAPHQL_URL = `${CLOUDFLARE_API_BASE}/graphql`

type CloudflareApiResponse<T> = {
  success: boolean
  errors?: Array<{ code?: number; message?: string }>
  messages?: Array<{ code?: number; message?: string }>
  result?: T
}

type CloudflareGraphqlResponse<T> = {
  data?: T
  errors?: Array<{ message?: string }>
}

function authHeaders(apiToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  }
}

function coerceErrorMessage(errs?: Array<{ message?: string }>, fallback = 'Cloudflare API error'): string {
  if (!Array.isArray(errs) || errs.length === 0) return fallback
  return errs.map((e) => e.message).filter(Boolean).join('; ') || fallback
}

async function cloudflareGet<T>(path: string, apiToken: string, query?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${CLOUDFLARE_API_BASE}${path}`)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v == null) continue
      url.searchParams.set(k, String(v))
    }
  }
  const res = await fetch(url.toString(), { method: 'GET', headers: authHeaders(apiToken) })
  const rawText = await res.text()
  let json: CloudflareApiResponse<T> | null = null
  try {
    json = rawText ? (JSON.parse(rawText) as CloudflareApiResponse<T>) : null
  } catch {
    json = null
  }
  if (!res.ok) {
    const msg = json ? coerceErrorMessage(json.errors, `Cloudflare API ${res.status}`) : `Cloudflare API ${res.status}`
    throw createError({ statusCode: 502, message: msg })
  }
  if (!json?.success) {
    throw createError({ statusCode: 502, message: coerceErrorMessage(json?.errors) })
  }
  return (json.result as T) ?? ({} as T)
}

async function cloudflareGraphql<T>(
  apiToken: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(CLOUDFLARE_GRAPHQL_URL, {
    method: 'POST',
    headers: authHeaders(apiToken),
    body: JSON.stringify({ query, variables }),
  })
  const rawText = await res.text()
  let json: CloudflareGraphqlResponse<T> | null = null
  try {
    json = rawText ? (JSON.parse(rawText) as CloudflareGraphqlResponse<T>) : null
  } catch {
    json = null
  }
  if (!res.ok) {
    const msg = json?.errors?.map((e) => e.message).filter(Boolean).join('; ') || `Cloudflare GraphQL ${res.status}`
    throw createError({ statusCode: 502, message: msg })
  }
  if (json?.errors?.length) {
    const msg = json.errors.map((e) => e.message).filter(Boolean).join('; ') || 'Cloudflare GraphQL error'
    throw createError({ statusCode: 502, message: msg })
  }
  if (!json?.data) {
    throw createError({ statusCode: 502, message: 'Cloudflare GraphQL returned no data.' })
  }
  return json.data
}

export async function validateToken(apiToken: string): Promise<{ valid: boolean; accountId?: string; message?: string }> {
  try {
    const result = await cloudflareGet<{ id?: string; status?: string }>('/user/tokens/verify', apiToken)
    const ok = String(result?.status || '').toLowerCase() === 'active'
    return { valid: ok, accountId: result?.id, message: ok ? undefined : 'Cloudflare token is not active.' }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { valid: false, message: msg || 'Invalid Cloudflare API token.' }
  }
}

export type CloudflareZoneItem = { zone_id: string; name: string }

export async function getZones(apiToken: string): Promise<CloudflareZoneItem[]> {
  const result = await cloudflareGet<Array<{ id?: string; name?: string }>>('/zones', apiToken, { per_page: 50 })
  return (result ?? [])
    .map((z) => ({ zone_id: String(z.id || ''), name: String(z.name || '') }))
    .filter((z) => z.zone_id && z.name)
}

export type CloudflareZoneAnalytics = {
  requests: number
  bandwidth: number
  threats: number
  cached_percent: number
}

export async function getZoneAnalytics(apiToken: string, zoneId: string): Promise<CloudflareZoneAnalytics> {
  const now = new Date()
  const endDate = now.toISOString().slice(0, 10)
  const start = new Date(now)
  start.setDate(start.getDate() - 1)
  const startDate = start.toISOString().slice(0, 10)
  const data = await cloudflareGraphql<{
    viewer?: {
      zones?: Array<{
        httpRequests1dGroups?: Array<{
          sum?: {
            requests?: number
            bytes?: number
            threats?: number
            cachedRequests?: number
          }
        }>
      }>
    }
  }>(
    apiToken,
    `
      query ZoneOverview($zoneTag: string!, $start: Date!, $end: Date!) {
        viewer {
          zones(filter: { zoneTag: $zoneTag }) {
            httpRequests1dGroups(
              limit: 1
              filter: { date_geq: $start, date_lt: $end }
              orderBy: [date_DESC]
            ) {
              dimensions {
                date
              }
              sum {
                requests
                bytes
                threats
                cachedRequests
              }
            }
          }
        }
      }
    `,
    {
      zoneTag: zoneId,
      start: startDate,
      end: endDate,
    },
  )

  const sum = data.viewer?.zones?.[0]?.httpRequests1dGroups?.[0]?.sum
  const requests = Number(sum?.requests ?? 0) || 0
  const cachedRequests = Number(sum?.cachedRequests ?? 0) || 0
  return {
    requests,
    bandwidth: Number(sum?.bytes ?? 0) || 0,
    threats: Number(sum?.threats ?? 0) || 0,
    cached_percent: requests > 0 ? (cachedRequests / requests) * 100 : 0,
  }
}

export type CloudflareZoneColoPerformanceRow = {
  colo: string
  requests: number
  bandwidth: number
}

export async function getZonePerformance(apiToken: string, zoneId: string): Promise<CloudflareZoneColoPerformanceRow[]> {
  const result = await cloudflareGet<Array<{ dimensions?: { colo?: string }; sum?: { requests?: number; bytes?: number } }>>(
    `/zones/${zoneId}/analytics/colos`,
    apiToken,
  )
  return (result ?? []).map((row) => ({
    colo: String(row?.dimensions?.colo || 'unknown'),
    requests: Number(row?.sum?.requests ?? 0) || 0,
    bandwidth: Number(row?.sum?.bytes ?? 0) || 0,
  }))
}

