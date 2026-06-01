import type PocketBase from 'pocketbase'
import { getDataForSeoCredentials } from '~/server/utils/dataforseo'
import { fetchBacklinksProfile } from '~/server/utils/dataforseoBacklinks'

type SiteRow = { domain?: string; backlinks_snapshot?: unknown }

export type ResolveBacklinksSnapshotOptions = {
  refresh?: boolean
  fetchIfMissing?: boolean
  /** When set with fetchIfMissing, refresh if snapshot is older than this many days. */
  maxAgeDays?: number
}

export async function resolveSiteBacklinksSnapshot(
  pb: PocketBase,
  siteId: string,
  site: SiteRow,
  opts: ResolveBacklinksSnapshotOptions = {},
): Promise<Record<string, unknown> | null> {
  const existing = site.backlinks_snapshot
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

  const data = await fetchBacklinksProfile(credentials, domain)
  try {
    await pb.collection('sites').update(siteId, { backlinks_snapshot: data as unknown as Record<string, unknown> })
  } catch {
    // Collection may be missing `backlinks_snapshot` until migration
  }
  return data as unknown as Record<string, unknown>
}
