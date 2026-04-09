import { getMethod, getRouterParam, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

export interface KeywordGroupPersisted {
  id: string
  name: string
  /** Normalized keyword strings belonging to this group */
  keywordNormals: string[]
}

interface SharedKeywordItem {
  keyword: string
  reason?: string
}

interface CompetitorItem {
  domain: string
  reason?: string
}

interface SavedResearch {
  seedKeyword: string
  competitors: CompetitorItem[]
  sharedKeywords: SharedKeywordItem[]
  updatedAt: string
  keywordGroups?: KeywordGroupPersisted[]
}

const RESEARCH_KEY = 'site_research'

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase()
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const body = (await readBody(event).catch(() => ({}))) as { keywordGroups?: KeywordGroupPersisted[] }
  const rawGroups = body.keywordGroups
  if (!Array.isArray(rawGroups)) {
    throw createError({ statusCode: 400, message: 'keywordGroups array is required.' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  let row: { id: string; value?: Record<string, unknown> } | null = null
  try {
    row = await pb
      .collection('app_settings')
      .getFirstListItem<{ id: string; value?: Record<string, unknown> }>(`key="${RESEARCH_KEY}"`)
  } catch {
    row = null
  }

  const currentBag = row?.value && typeof row.value === 'object' ? { ...row.value } : {}
  const existing = currentBag[siteId] as SavedResearch | undefined
  if (!existing?.sharedKeywords?.length) {
    throw createError({ statusCode: 400, message: 'Save research first before organizing groups.' })
  }

  const allowed = new Set(existing.sharedKeywords.map((k) => normalizeKeyword(k.keyword)))

  const seenIds = new Set<string>()
  const keywordGroups: KeywordGroupPersisted[] = []
  const usedNorms = new Set<string>()
  for (const g of rawGroups) {
    if (!g || typeof g !== 'object') continue
    const id = typeof g.id === 'string' && g.id.trim() ? g.id.trim() : ''
    const name = typeof g.name === 'string' ? g.name.trim() : ''
    if (!id || seenIds.has(id)) continue
    seenIds.add(id)
    const normsRaw = Array.isArray(g.keywordNormals) ? g.keywordNormals : []
    const keywordNormals = Array.from(new Set(normsRaw.map((n) => normalizeKeyword(String(n))))).filter(
      (n) => allowed.has(n) && !usedNorms.has(n),
    )
    for (const n of keywordNormals) usedNorms.add(n)
    keywordGroups.push({ id, name: name || 'Untitled group', keywordNormals })
  }

  const merged: SavedResearch = {
    ...existing,
    keywordGroups,
  }

  currentBag[siteId] = merged

  if (row) {
    await pb.collection('app_settings').update(row.id, { value: currentBag })
  } else {
    await pb.collection('app_settings').create({ key: RESEARCH_KEY, value: currentBag })
  }

  return { research: merged }
})
