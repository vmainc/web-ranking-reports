/** Client-safe types/helpers for Workspace competitive snapshots. */

export type CompetitiveSnapshotKeywordRow = {
  keyword: string
  searchVolume: number | null
  prospectPosition: number | null
  leader: { domain: string; position: number } | null
}

export type CompetitiveSnapshotCompetitor = {
  domain: string
  overlapCount: number
  sampleKeywords: string[]
}

export type CompetitiveSnapshot = {
  targetDomain: string
  keywords: string[]
  keywordSource: 'manual' | 'auto'
  keywordRows: CompetitiveSnapshotKeywordRow[]
  competitors: CompetitiveSnapshotCompetitor[]
  talkingPoints: string[]
  updatedAt: string
}

export function snapshotMatchKey(targetDomain: string): string {
  const d = targetDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || ''
  return `snapshot:${d}`
}
