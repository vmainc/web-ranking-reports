import { createError } from 'h3'

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4'

type CloudflareApiResponse<T> = {
  success: boolean
  errors?: Array<{ code?: number; message?: string }>
  messages?: Array<{ code?: number; message?: string }>
  result?: T
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
  const result = await cloudflareGet<{
    totals?: {
      requests?: { all?: number }
      bandwidth?: { all?: number }
      threats?: { all?: number }
      cached?: { percentage?: number }
    }
  }>(`/zones/${zoneId}/analytics/dashboard`, apiToken)

  const totals = result?.totals
  return {
    requests: Number(totals?.requests?.all ?? 0) || 0,
    bandwidth: Number(totals?.bandwidth?.all ?? 0) || 0,
    threats: Number(totals?.threats?.all ?? 0) || 0,
    cached_percent: Number(totals?.cached?.percentage ?? 0) || 0,
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

