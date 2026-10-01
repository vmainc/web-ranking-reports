import { addDaysYmd } from '~/server/services/social/metrics/aggregateInsights'
import { COLLECTIONS, type NormalizedSocialPost } from '~/server/services/social/types'
import { isMissingCollectionError } from '~/server/utils/pbMissingCollection'

export type SocialPostRow = {
  id: string
  site: string
  social_connection: string
  provider: string
  platform: string
  asset_type: string
  external_post_id: string
  published_at: string
  message: string
  permalink: string
  media_url: string
  media_type: string
  reactions: number | null
  comments: number | null
  shares: number | null
  reach: number | null
  views: number | null
  clicks: number | null
  metrics_json: Record<string, unknown> | null
  collected_at: string
  snapshot_date: string
  dedupe_key: string
}

export function socialPostDedupeKey(connectionId: string, externalPostId: string): string {
  return `${connectionId}|${externalPostId}`
}

export function publicSocialPost(row: SocialPostRow) {
  const raw = row.metrics_json && typeof row.metrics_json === 'object' && !Array.isArray(row.metrics_json)
    ? row.metrics_json
    : {}
  const reactionsByType =
    raw.reactionsByType && typeof raw.reactionsByType === 'object' && !Array.isArray(raw.reactionsByType)
      ? (raw.reactionsByType as Record<string, number>)
      : {}
  return {
    id: row.id,
    externalPostId: row.external_post_id,
    publishedAt: row.published_at,
    message: row.message || '',
    permalink: row.permalink || '',
    mediaUrl: row.media_url || '',
    mediaType: row.media_type || '',
    reactions: row.reactions,
    comments: row.comments,
    shares: row.shares,
    reach: row.reach,
    views: row.views,
    clicks: row.clicks,
    reactionsByType,
  }
}

export type PublicSocialPost = ReturnType<typeof publicSocialPost>

export function sortSocialPosts(rows: SocialPostRow[], sort: 'published' | 'reach'): SocialPostRow[] {
  const copy = [...rows]
  if (sort === 'reach') {
    copy.sort((a, b) => (b.reach ?? -1) - (a.reach ?? -1) || b.published_at.localeCompare(a.published_at))
  } else {
    copy.sort((a, b) => b.published_at.localeCompare(a.published_at))
  }
  return copy
}

function finiteOrNull(n: number | null | undefined): number | null {
  return n != null && Number.isFinite(n) ? n : null
}

export async function upsertSocialPost(
  pb: PocketBase,
  opts: {
    siteId: string
    connectionId: string
    provider: string
    platform: string
    assetType: string
    post: NormalizedSocialPost
    collectedAt: string
    snapshotDate: string
  },
): Promise<{ id: string; created: boolean }> {
  if (!opts.post.externalId) return { id: '', created: false }
  const dedupe_key = socialPostDedupeKey(opts.connectionId, opts.post.externalId)
  const payload = {
    site: opts.siteId,
    social_connection: opts.connectionId,
    provider: opts.provider,
    platform: opts.platform,
    asset_type: opts.assetType,
    external_post_id: opts.post.externalId,
    published_at: opts.post.publishedAt || opts.snapshotDate,
    message: (opts.post.message || '').slice(0, 16000),
    permalink: (opts.post.permalink || '').slice(0, 1000),
    media_url: (opts.post.mediaUrl || '').slice(0, 2000),
    media_type: (opts.post.mediaType || '').slice(0, 40),
    reactions: finiteOrNull(opts.post.engagement?.reactions),
    comments: finiteOrNull(opts.post.engagement?.comments),
    shares: finiteOrNull(opts.post.engagement?.shares),
    reach: finiteOrNull(opts.post.reach),
    views: finiteOrNull(opts.post.views),
    clicks: finiteOrNull(opts.post.clicks),
    metrics_json: {
      reactionsByType: opts.post.reactionsByType || {},
    },
    collected_at: opts.collectedAt,
    snapshot_date: opts.snapshotDate,
    dedupe_key,
  }

  try {
    const existing = await pb.collection(COLLECTIONS.socialPosts).getFirstListItem<SocialPostRow>(
      `dedupe_key = "${dedupe_key.replace(/"/g, '\\"')}"`,
    )
    await pb.collection(COLLECTIONS.socialPosts).update(existing.id, payload)
    return { id: existing.id, created: false }
  } catch {
    const created = await pb.collection(COLLECTIONS.socialPosts).create<SocialPostRow>(payload)
    return { id: created.id, created: true }
  }
}

export async function listSocialPostsForConnection(
  pb: PocketBase,
  connectionId: string,
  opts?: { since?: string; until?: string; limit?: number },
): Promise<SocialPostRow[]> {
  const parts = [`social_connection = "${connectionId.replace(/"/g, '\\"')}"`]
  if (opts?.since) parts.push(`published_at >= "${opts.since.slice(0, 10).replace(/"/g, '\\"')}"`)
  if (opts?.until) {
    const exclusive = addDaysYmd(opts.until.slice(0, 10), 1)
    parts.push(`published_at < "${exclusive.replace(/"/g, '\\"')}"`)
  }
  try {
    return await pb.collection(COLLECTIONS.socialPosts).getFullList<SocialPostRow>({
      filter: parts.join(' && '),
      sort: '-published_at',
      batch: opts?.limit && opts.limit < 200 ? opts.limit : 200,
    })
  } catch (e) {
    if (isMissingCollectionError(e)) return []
    throw e
  }
}
