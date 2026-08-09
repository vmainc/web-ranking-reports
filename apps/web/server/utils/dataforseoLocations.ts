/**
 * Cached DataForSEO Google SERP locations list + search.
 * Source: GET https://api.dataforseo.com/v3/serp/google/locations
 */

import type PocketBase from 'pocketbase'
import { getDataForSeoCredentials } from '~/server/utils/dataforseo'

const LOCATIONS_URL = 'https://api.dataforseo.com/v3/serp/google/locations'
/** Refresh at most once per week unless forced. */
export const DFS_LOCATIONS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const APP_SETTINGS_KEY = 'dataforseo_google_locations'

export interface DfsLocationRow {
  location_code: number
  location_name: string
  location_code_parent?: number | null
  country_iso_code?: string
  location_type?: string
}

interface LocationsCachePayload {
  fetchedAt: string
  locations: DfsLocationRow[]
}

let memoryCache: { fetchedAtMs: number; locations: DfsLocationRow[] } | null = null

function normalizeRow(raw: Record<string, unknown>): DfsLocationRow | null {
  const code = typeof raw.location_code === 'number' ? raw.location_code : null
  const name = typeof raw.location_name === 'string' ? raw.location_name.trim() : ''
  if (!code || !name) return null
  return {
    location_code: code,
    location_name: name,
    location_code_parent: typeof raw.location_code_parent === 'number' ? raw.location_code_parent : null,
    country_iso_code: typeof raw.country_iso_code === 'string' ? raw.country_iso_code : undefined,
    location_type: typeof raw.location_type === 'string' ? raw.location_type : undefined,
  }
}

async function fetchRemoteLocations(credentials: {
  login: string
  password: string
}): Promise<DfsLocationRow[]> {
  const auth = Buffer.from(`${credentials.login}:${credentials.password}`).toString('base64')
  const res = await fetch(LOCATIONS_URL, {
    method: 'GET',
    headers: { Authorization: `Basic ${auth}` },
  })
  const data = (await res.json()) as {
    status_code?: number
    tasks?: Array<{ result?: Array<Record<string, unknown>> }>
  }
  if (data.status_code !== 20000) {
    throw new Error(typeof (data as { status_message?: string }).status_message === 'string'
      ? (data as { status_message: string }).status_message
      : `DataForSEO locations status ${data.status_code}`)
  }
  const rows = data.tasks?.[0]?.result ?? []
  const out: DfsLocationRow[] = []
  for (const r of rows) {
    const n = normalizeRow(r)
    if (n) out.push(n)
  }
  return out
}

async function readPbCache(pb: PocketBase): Promise<LocationsCachePayload | null> {
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value?: LocationsCachePayload }>(
      `key="${APP_SETTINGS_KEY}"`,
    )
    const v = row?.value
    if (v && Array.isArray(v.locations) && typeof v.fetchedAt === 'string') return v
  } catch {
    // missing
  }
  return null
}

async function writePbCache(pb: PocketBase, payload: LocationsCachePayload): Promise<void> {
  try {
    const existing = await pb.collection('app_settings').getFirstListItem<{ id: string }>(`key="${APP_SETTINGS_KEY}"`)
    await pb.collection('app_settings').update(existing.id, { value: payload })
  } catch {
    try {
      await pb.collection('app_settings').create({ key: APP_SETTINGS_KEY, value: payload })
    } catch {
      // non-fatal — memory cache still works
    }
  }
}

export async function getCachedDfsLocations(
  pb: PocketBase,
  options?: { forceRefresh?: boolean },
): Promise<{ locations: DfsLocationRow[]; fetchedAt: string; fromCache: boolean }> {
  const now = Date.now()
  if (!options?.forceRefresh && memoryCache && now - memoryCache.fetchedAtMs < DFS_LOCATIONS_CACHE_TTL_MS) {
    return {
      locations: memoryCache.locations,
      fetchedAt: new Date(memoryCache.fetchedAtMs).toISOString(),
      fromCache: true,
    }
  }

  if (!options?.forceRefresh) {
    const pbCache = await readPbCache(pb)
    if (pbCache) {
      const age = now - new Date(pbCache.fetchedAt).getTime()
      if (Number.isFinite(age) && age >= 0 && age < DFS_LOCATIONS_CACHE_TTL_MS && pbCache.locations.length) {
        memoryCache = { fetchedAtMs: new Date(pbCache.fetchedAt).getTime(), locations: pbCache.locations }
        return { locations: pbCache.locations, fetchedAt: pbCache.fetchedAt, fromCache: true }
      }
    }
  }

  const creds = await getDataForSeoCredentials(pb)
  if (!creds) {
    // Fall back to stale cache if present
    if (memoryCache?.locations.length) {
      return {
        locations: memoryCache.locations,
        fetchedAt: new Date(memoryCache.fetchedAtMs).toISOString(),
        fromCache: true,
      }
    }
    const pbCache = await readPbCache(pb)
    if (pbCache?.locations.length) {
      return { locations: pbCache.locations, fetchedAt: pbCache.fetchedAt, fromCache: true }
    }
    throw new Error('DataForSEO is not configured')
  }

  const locations = await fetchRemoteLocations(creds)
  const fetchedAt = new Date().toISOString()
  memoryCache = { fetchedAtMs: Date.now(), locations }
  await writePbCache(pb, { fetchedAt, locations })
  return { locations, fetchedAt, fromCache: false }
}

/**
 * Search cached locations. V1 focuses on US Country + City (+ optional Postal Code when query looks numeric).
 */
export function searchDfsLocations(
  locations: DfsLocationRow[],
  query: string,
  options?: { countryIso?: string; limit?: number },
): DfsLocationRow[] {
  const q = query.trim().toLowerCase()
  const country = (options?.countryIso || 'US').toUpperCase()
  const limit = options?.limit ?? 25

  const pool = locations.filter((loc) => {
    if (country && loc.country_iso_code && loc.country_iso_code.toUpperCase() !== country) return false
    const t = (loc.location_type || '').toLowerCase()
    // Prefer country + city for picker; allow postal when query has digits
    if (t === 'country' || t === 'city' || t === 'municipality') return true
    if (/\d/.test(q) && (t.includes('postal') || t.includes('zip') || t === 'postal code')) return true
    // Also allow DMA / metro if named
    if (t.includes('metro') || t === 'dma') return true
    return t === '' // unknown type — still searchable
  })

  if (!q) {
    // Default suggestions: United States + a few major cities if present
    const us = pool.find((l) => l.location_code === 2840)
    const cities = pool.filter((l) => (l.location_type || '').toLowerCase() === 'city').slice(0, limit - 1)
    return us ? [us, ...cities.filter((c) => c.location_code !== 2840)] : cities.slice(0, limit)
  }

  const scored: Array<{ loc: DfsLocationRow; score: number }> = []
  for (const loc of pool) {
    const name = loc.location_name.toLowerCase()
    if (!name.includes(q)) continue
    let score = 0
    if (name.startsWith(q)) score += 50
    if (name.split(',')[0]?.trim() === q) score += 40
    const type = (loc.location_type || '').toLowerCase()
    if (type === 'city') score += 20
    if (type === 'country') score += 10
    if (loc.location_code === 2840) score += 5
    score += Math.max(0, 30 - name.length / 4)
    scored.push({ loc, score })
  }
  scored.sort((a, b) => b.score - a.score || a.loc.location_name.localeCompare(b.loc.location_name))
  return scored.slice(0, limit).map((s) => s.loc)
}

/** Clear in-memory cache (tests). */
export function clearDfsLocationsMemoryCache(): void {
  memoryCache = null
}
