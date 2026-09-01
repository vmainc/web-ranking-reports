import type PocketBase from 'pocketbase'
import { getDataForSeoCredentials } from '~/server/utils/dataforseo'
import { fetchAiVisibilityProfile, MAX_KEYWORDS_PER_FETCH } from '~/server/utils/dataforseoAiVisibility'

type SiteRow = { domain?: string; ai_visibility_snapshot?: unknown }

export type ResolveAiVisibilitySnapshotOptions = {
  refresh?: boolean
  fetchIfMissing?: boolean
  maxAgeDays?: number
  /** Include up to N tracked keywords (from rank_keywords). */
  maxKeywords?: number
}

async function loadTrackedKeywords(pb: PocketBase, siteId: string, limit: number): Promise<string[]> {
  if (limit <= 0) return []
  try {
    const rows = await pb.collection('rank_keywords').getFullList<{ keyword?: string }>({
      filter: `site = "${siteId}"`,
      sort: '-updated',
    })
    const seen = new Set<string>()
    const out: string[] = []
    for (const row of rows) {
      const k = (row.keyword ?? '').trim()
      if (!k) continue
      const key = k.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(k)
      if (out.length >= limit) break
    }
    return out
  } catch {
    return []
  }
}

export async function resolveSiteAiVisibilitySnapshot(
  pb: PocketBase,
  siteId: string,
  site: SiteRow,
  opts: ResolveAiVisibilitySnapshotOptions = {},
): Promise<Record<string, unknown> | null> {
  const existing = site.ai_visibility_snapshot
  const hasSnap = existing && typeof existing === 'object' && !Array.isArray(existing)

  let needsFetch = !!opts.refresh
  if (!needsFetch && opts.fetchIfMissing) {
    if (!hasSnap) {
      needsFetch = true
    } else if (opts.maxAgeDays && opts.maxAgeDays > 0) {
      const fetchedAt = (existing as { fetchedAt?: string }).fetchedAt
      if (fetchedAt) {
        const ageMs = Date.now() - new Date(fetchedAt).getTime()
        if (!Number.isNaN(ageMs) && ageMs > opts.maxAgeDays * 86_400_000) needsFetch = true
      }
    }
  }

  if (!needsFetch) {
    return hasSnap ? (existing as Record<string, unknown>) : null
  }

  const domain = site.domain?.trim()
  if (!domain) {
    throw createError({ statusCode: 400, message: 'Site has no domain' })
  }

  const credentials = await getDataForSeoCredentials(pb)
  if (!credentials) {
    throw createError({
      statusCode: 503,
      message: 'DataForSEO is not configured. An admin can add credentials in Admin → Integrations.',
    })
  }

  const kwLimit = Math.min(
    MAX_KEYWORDS_PER_FETCH,
    Math.max(0, Math.round(opts.maxKeywords ?? MAX_KEYWORDS_PER_FETCH)),
  )
  const keywords = await loadTrackedKeywords(pb, siteId, kwLimit)
  const data = await fetchAiVisibilityProfile(credentials, domain, keywords)

  try {
    await pb.collection('sites').update(siteId, { ai_visibility_snapshot: data as unknown as Record<string, unknown> })
  } catch {
    // Collection may be missing `ai_visibility_snapshot` until migration
  }
  return data as unknown as Record<string, unknown>
}
