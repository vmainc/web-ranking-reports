export type ProspectCompetitor = { domain: string; reason?: string }
export type ProspectSharedKeyword = { keyword: string; reason?: string }
export type ProspectDomainKeyword = {
  keyword: string
  position: number
  searchVolume?: number | null
  url?: string
}

export type ProspectResearchItem = {
  researchType?: 'keyword' | 'domain'
  seedKeyword: string
  contextDomain?: string
  targetDomain?: string
  competitors: ProspectCompetitor[]
  sharedKeywords: ProspectSharedKeyword[]
  domainKeywords?: ProspectDomainKeyword[]
  totalKeywordCount?: number
  updatedAt: string
}

export type ProspectKeywordRow = {
  keyword: string
  reason?: string
  position?: number
  searchVolume?: number | null
  url?: string
}

export function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase()
}

export function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
}

export function isDomainResearch(item: ProspectResearchItem): boolean {
  return item.researchType === 'domain' || (!!item.targetDomain && Array.isArray(item.domainKeywords))
}

export function researchTitle(item: ProspectResearchItem): string {
  if (isDomainResearch(item)) return item.targetDomain || 'Domain research'
  return item.seedKeyword
}

export function researchKey(item: ProspectResearchItem): string {
  if (isDomainResearch(item)) return `domain:${normalizeDomain(item.targetDomain || '')}`
  return `keyword:${normalizeKeyword(item.seedKeyword)}`
}

export function keywordRowsFor(item: ProspectResearchItem): ProspectKeywordRow[] {
  if (isDomainResearch(item)) {
    return (item.domainKeywords ?? []).map((row) => ({
      keyword: row.keyword,
      position: row.position,
      searchVolume: row.searchVolume,
      url: row.url,
    }))
  }
  return (item.sharedKeywords ?? []).map((row) => ({
    keyword: row.keyword,
    reason: row.reason,
  }))
}

export function formatResearchForCard(opts: {
  item: ProspectResearchItem
  selectedKeywords?: string[]
}): string {
  const { item } = opts
  const selectedSet = new Set((opts.selectedKeywords || []).map(normalizeKeyword).filter(Boolean))
  const lines: string[] = []
  const stamp = new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })

  if (isDomainResearch(item)) {
    lines.push(`Domain research: ${item.targetDomain || '—'}`)
    lines.push(`Saved ${stamp}`)
    if (item.totalKeywordCount) lines.push(`Total ranked keywords (approx): ${item.totalKeywordCount}`)
    lines.push('')
    const rows = keywordRowsFor(item).filter((row) => {
      if (!selectedSet.size) return true
      return selectedSet.has(normalizeKeyword(row.keyword))
    })
    if (selectedSet.size) lines.push(`Selected keywords (${rows.length}):`)
    else lines.push(`Top keywords (${Math.min(rows.length, 40)}):`)
    for (const row of rows.slice(0, selectedSet.size ? 80 : 40)) {
      const bits = [row.keyword]
      if (row.position) bits.push(`#${row.position}`)
      if (row.searchVolume != null) bits.push(`vol ${row.searchVolume}`)
      lines.push(`- ${bits.join(' · ')}`)
    }
  } else {
    lines.push(`Keyword research: ${item.seedKeyword}`)
    if (item.contextDomain) lines.push(`Related domain: ${item.contextDomain}`)
    lines.push(`Saved ${stamp}`)
    lines.push('')
    if (item.competitors?.length) {
      lines.push('Competitors:')
      for (const c of item.competitors.slice(0, 10)) {
        lines.push(`- ${c.domain}${c.reason ? ` — ${c.reason}` : ''}`)
      }
      lines.push('')
    }
    const rows = keywordRowsFor(item).filter((row) => {
      if (!selectedSet.size) return true
      return selectedSet.has(normalizeKeyword(row.keyword))
    })
    if (selectedSet.size) lines.push(`Selected keywords (${rows.length}):`)
    else lines.push(`Shared keywords (${rows.length}):`)
    for (const row of rows.slice(0, selectedSet.size ? 80 : 40)) {
      lines.push(`- ${row.keyword}${row.reason ? ` — ${row.reason}` : ''}`)
    }
  }

  return lines.join('\n').trim()
}

export function defaultCardTitle(item: ProspectResearchItem): string {
  if (isDomainResearch(item)) return item.targetDomain || 'Domain research'
  return item.seedKeyword || 'Keyword research'
}
