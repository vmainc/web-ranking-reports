import type PocketBase from 'pocketbase'
import { createError } from 'h3'
import { fetchSerpRank, getDataForSeoCredentials } from '~/server/utils/dataforseo'
import { fetchDomainRankedKeywords } from '~/server/utils/dataforseoLabs'
import { normalizeDomain } from '~/server/utils/prospectResearch'
import type {
  CompetitiveSnapshot,
  CompetitiveSnapshotCompetitor,
  CompetitiveSnapshotKeywordRow,
} from '~/utils/competitiveSnapshot'
import { snapshotMatchKey } from '~/utils/competitiveSnapshot'

export type {
  CompetitiveSnapshot,
  CompetitiveSnapshotCompetitor,
  CompetitiveSnapshotKeywordRow,
} from '~/utils/competitiveSnapshot'
export { snapshotMatchKey } from '~/utils/competitiveSnapshot'

export const WORKSPACE_COMPETITIVE_SNAPSHOTS_KEY = 'workspace_competitive_snapshots'
export const MAX_COMPETITIVE_SNAPSHOTS = 15
const SNAPSHOT_KEYWORD_LIMIT = 5
const SNAPSHOT_SERP_DEPTH = 20

function parseManualKeywords(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(/[\n,]+/)) {
    const kw = part.trim()
    if (!kw) continue
    const key = kw.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(kw)
    if (out.length >= SNAPSHOT_KEYWORD_LIMIT) break
  }
  return out
}

function rootDomainFromHost(host: string): string {
  const h = host.toLowerCase().replace(/^www\./, '')
  return h
}

function isSameDomain(a: string, b: string): boolean {
  const na = rootDomainFromHost(normalizeDomain(a))
  const nb = rootDomainFromHost(normalizeDomain(b))
  return na === nb || na.endsWith(`.${nb}`) || nb.endsWith(`.${na}`)
}

function pickLeader(
  organicTop: Array<{ rankGroup: number; domain: string }>,
  prospectDomain: string,
): { domain: string; position: number } | null {
  for (const row of organicTop) {
    const domain = (row.domain || '').trim()
    if (!domain || isSameDomain(domain, prospectDomain)) continue
    if (row.rankGroup > 0) return { domain: rootDomainFromHost(domain), position: row.rankGroup }
  }
  return null
}

export function buildCompetitiveTalkingPoints(
  targetDomain: string,
  rows: CompetitiveSnapshotKeywordRow[],
  competitors: CompetitiveSnapshotCompetitor[],
): string[] {
  const points: string[] = []
  for (const row of rows) {
    const leader = row.leader
    if (!leader) continue
    const kw = row.keyword
    if (row.prospectPosition == null) {
      points.push(`Not in the top 10 for “${kw}” — ${leader.domain} ranks #${leader.position}.`)
    } else if (row.prospectPosition > leader.position) {
      points.push(
        `Behind ${leader.domain} on “${kw}” (you #${row.prospectPosition}, them #${leader.position}).`,
      )
    }
  }
  const top = competitors[0]
  if (top && top.overlapCount >= 2) {
    points.push(
      `${top.domain} shows up in ${top.overlapCount} of ${rows.length} SERPs checked — strong overlap on your money terms.`,
    )
  }
  if (!points.length && rows.length) {
    points.push(`${targetDomain} is competitive on the keywords checked — no clear laggard in the top 10.`)
  }
  return points.slice(0, 6)
}

async function resolveMoneyKeywords(
  pb: PocketBase,
  targetDomain: string,
  manualRaw?: string,
): Promise<{ keywords: string[]; source: 'manual' | 'auto'; volumes: Map<string, number | null> }> {
  const manual = parseManualKeywords(manualRaw || '')
  const volumes = new Map<string, number | null>()

  if (manual.length) {
    manual.forEach((k) => volumes.set(k, null))
    return { keywords: manual, source: 'manual', volumes }
  }

  const credentials = await getDataForSeoCredentials(pb)
  if (!credentials) {
    throw createError({
      statusCode: 400,
      message: 'Add money keywords (up to 5) or configure DataForSEO in Admin → Integrations to auto-pick from the domain.',
    })
  }

  const fetched = await fetchDomainRankedKeywords(credentials, targetDomain, { limit: 40 })
  if (fetched.error) {
    throw createError({
      statusCode: 502,
      message: fetched.error,
    })
  }

  const sorted = [...fetched.keywords]
    .filter((k) => k.keyword && k.position > 0)
    .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
    .slice(0, SNAPSHOT_KEYWORD_LIMIT)

  if (!sorted.length) {
    throw createError({
      statusCode: 400,
      message: 'No ranked keywords found for this domain. Enter 1–5 money keywords manually.',
    })
  }

  for (const row of sorted) {
    volumes.set(row.keyword, row.searchVolume)
  }
  return { keywords: sorted.map((k) => k.keyword), source: 'auto', volumes }
}

export async function runCompetitiveSnapshot(
  pb: PocketBase,
  opts: { targetDomain: string; keywords?: string },
): Promise<CompetitiveSnapshot> {
  const targetDomain = normalizeDomain(opts.targetDomain || '')
  if (!targetDomain.includes('.')) {
    throw createError({ statusCode: 400, message: 'Enter a valid prospect domain (e.g. prospect.com).' })
  }

  const credentials = await getDataForSeoCredentials(pb)
  if (!credentials) {
    throw createError({
      statusCode: 503,
      message: 'DataForSEO is not configured. An admin can add credentials in Admin → Integrations.',
    })
  }

  const { keywords, source, volumes } = await resolveMoneyKeywords(pb, targetDomain, opts.keywords)

  const competitorHits = new Map<string, Set<string>>()
  const keywordRows: CompetitiveSnapshotKeywordRow[] = []

  for (const keyword of keywords) {
    const result = await fetchSerpRank(credentials, keyword, targetDomain, {
      depth: SNAPSHOT_SERP_DEPTH,
      includeSubdomains: true,
    })

    const prospectPosition = result.rankingStatus === 'ranked' && result.position > 0 ? result.position : null
    const organicTop = result.serpSummary?.organicTopDomains ?? []
    const leader = pickLeader(organicTop, targetDomain)

    for (const row of organicTop) {
      const domain = rootDomainFromHost(row.domain || '')
      if (!domain || isSameDomain(domain, targetDomain)) continue
      if (!competitorHits.has(domain)) competitorHits.set(domain, new Set())
      competitorHits.get(domain)!.add(keyword)
    }

    keywordRows.push({
      keyword,
      searchVolume: volumes.get(keyword) ?? null,
      prospectPosition,
      leader,
    })
  }

  const competitors: CompetitiveSnapshotCompetitor[] = [...competitorHits.entries()]
    .map(([domain, kws]) => ({
      domain,
      overlapCount: kws.size,
      sampleKeywords: [...kws].slice(0, 4),
    }))
    .sort((a, b) => b.overlapCount - a.overlapCount || a.domain.localeCompare(b.domain))
    .slice(0, 5)

  const talkingPoints = buildCompetitiveTalkingPoints(targetDomain, keywordRows, competitors)

  return {
    targetDomain,
    keywords,
    keywordSource: source,
    keywordRows,
    competitors,
    talkingPoints,
    updatedAt: new Date().toISOString(),
  }
}

function normalizeSnapshots(value: unknown): CompetitiveSnapshot[] {
  if (!Array.isArray(value)) return []
  return value.filter((item) => {
    if (!item || typeof item !== 'object') return false
    const v = item as CompetitiveSnapshot
    return typeof v.targetDomain === 'string' && Array.isArray(v.keywordRows)
  }) as CompetitiveSnapshot[]
}

export async function loadCompetitiveSnapshots(pb: PocketBase, ownerId: string): Promise<CompetitiveSnapshot[]> {
  try {
    const row = await pb
      .collection('app_settings')
      .getFirstListItem<{ value?: Record<string, unknown> }>(`key="${WORKSPACE_COMPETITIVE_SNAPSHOTS_KEY}"`)
    return normalizeSnapshots(row?.value?.[ownerId])
  } catch {
    return []
  }
}

export async function upsertCompetitiveSnapshot(
  pb: PocketBase,
  ownerId: string,
  snapshot: CompetitiveSnapshot,
): Promise<CompetitiveSnapshot[]> {
  let row: { id: string; value?: Record<string, unknown> } | null = null
  try {
    row = await pb
      .collection('app_settings')
      .getFirstListItem<{ id: string; value?: Record<string, unknown> }>(
        `key="${WORKSPACE_COMPETITIVE_SNAPSHOTS_KEY}"`,
      )
  } catch {
    row = null
  }

  const current: Record<string, unknown> = row?.value && typeof row.value === 'object' ? { ...row.value } : {}
  const existing = normalizeSnapshots(current[ownerId])
  const key = snapshotMatchKey(snapshot.targetDomain)
  const next = [snapshot, ...existing.filter((s) => snapshotMatchKey(s.targetDomain) !== key)].slice(
    0,
    MAX_COMPETITIVE_SNAPSHOTS,
  )
  current[ownerId] = next

  if (row) await pb.collection('app_settings').update(row.id, { value: current })
  else await pb.collection('app_settings').create({ key: WORKSPACE_COMPETITIVE_SNAPSHOTS_KEY, value: current })

  return next
}

export async function deleteCompetitiveSnapshot(
  pb: PocketBase,
  ownerId: string,
  matchKey: string,
): Promise<CompetitiveSnapshot[]> {
  let row: { id: string; value?: Record<string, unknown> } | null = null
  try {
    row = await pb
      .collection('app_settings')
      .getFirstListItem<{ id: string; value?: Record<string, unknown> }>(
        `key="${WORKSPACE_COMPETITIVE_SNAPSHOTS_KEY}"`,
      )
  } catch {
    row = null
  }
  if (!row) return []

  const current: Record<string, unknown> = row.value && typeof row.value === 'object' ? { ...row.value } : {}
  const existing = normalizeSnapshots(current[ownerId])
  const target = matchKey.trim().toLowerCase()
  const next = existing.filter((s) => snapshotMatchKey(s.targetDomain).toLowerCase() !== target)
  if (next.length === existing.length) {
    throw createError({ statusCode: 404, message: 'Snapshot not found.' })
  }
  current[ownerId] = next
  await pb.collection('app_settings').update(row.id, { value: current })
  return next
}
