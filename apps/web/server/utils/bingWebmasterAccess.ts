/**
 * Bing Webmaster Tools API (API key auth).
 * Base: https://ssl.bing.com/webmaster/api.svc/json/METHOD_NAME?apikey=API_KEY
 */

import type PocketBase from 'pocketbase'

const BING_API_BASE = 'https://ssl.bing.com/webmaster/api.svc/json'

export interface BingWebmasterConfig {
  api_key: string
}

export interface BingWebmasterIntegrationRecord {
  id: string
  site: string
  provider: string
  status: string
  config_json?: {
    api_key?: string
  }
}

export function hasBingWebmasterConfig(integration: BingWebmasterIntegrationRecord | null): boolean {
  const key = integration?.config_json?.api_key
  return Boolean(typeof key === 'string' && key.trim().length > 0)
}

export async function getBingWebmasterIntegration(
  pb: PocketBase,
  siteId: string
): Promise<BingWebmasterIntegrationRecord | null> {
  const list = await pb.collection('integrations').getFullList<BingWebmasterIntegrationRecord>({
    filter: `site = "${siteId}" && provider = "bing_webmaster"`,
  })
  return list[0] ?? null
}

export async function getBingWebmasterConfig(
  pb: PocketBase,
  siteId: string
): Promise<BingWebmasterConfig> {
  const integration = await getBingWebmasterIntegration(pb, siteId)
  if (!integration?.config_json?.api_key?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Bing Webmaster Tools is not configured. Add your API key in Integrations (Configure).',
    })
  }
  return {
    api_key: (integration.config_json.api_key as string).trim(),
  }
}

/** Call Bing Webmaster JSON API (GET). Method e.g. GetUserSites. */
export async function bingWebmasterGet<T>(
  apiKey: string,
  method: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${BING_API_BASE}/${method}`)
  url.searchParams.set('apikey', apiKey)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { method: 'GET' })
  if (!res.ok) {
    const text = await res.text()
    throw createError({
      statusCode: res.status,
      message: text || `Bing Webmaster API error: ${res.status}`,
    })
  }
  return (await res.json()) as T
}

/** Validate API key by calling GetUserSites. Returns true if key works. */
export async function validateBingApiKey(apiKey: string): Promise<{ valid: boolean; message?: string }> {
  try {
    const data = await bingWebmasterGet<{ d?: unknown[]; Message?: string }>(apiKey.trim(), 'GetUserSites')
    if (data.Message) return { valid: false, message: data.Message }
    if (Array.isArray(data.d) || (typeof data === 'object' && 'd' in data)) return { valid: true }
    return { valid: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { valid: false, message: msg }
  }
}
