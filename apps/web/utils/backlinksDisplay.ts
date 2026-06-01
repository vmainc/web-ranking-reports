export function topObjectEntries(obj: unknown, limit: number): [string, number][] {
  if (!obj || typeof obj !== 'object') return []
  const ent = Object.entries(obj as Record<string, unknown>)
    .map(([k, v]) => {
      const n = typeof v === 'number' ? v : Number(v)
      return [k, n] as [string, number]
    })
    .filter(([, n]) => !Number.isNaN(n))
    .sort((a, b) => b[1] - a[1])
  return ent.slice(0, limit)
}

export function formatBacklinksMetric(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return v.toLocaleString()
  if (typeof v === 'string') return v.trim() || '—'
  return '—'
}

export function formatBacklinksWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso || '—'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatBacklinksNum(v: number | undefined | null): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return v.toLocaleString()
}

export function backlinksSummaryKpiRows(summary: Record<string, unknown> | null, compact: boolean) {
  if (!summary) return [] as { label: string; value: string }[]
  const rows: { label: string; key: string }[] = compact
    ? [
        { label: 'Backlinks', key: 'backlinks' },
        { label: 'Referring domains', key: 'referring_domains' },
        { label: 'Referring pages', key: 'referring_pages' },
        { label: 'Domain rank (0–100)', key: 'rank' },
        { label: 'Target spam score', key: 'target_spam_score' },
        { label: 'Backlinks spam score', key: 'backlinks_spam_score' },
        { label: 'Broken backlinks', key: 'broken_backlinks' },
      ]
    : [
        { label: 'Backlinks', key: 'backlinks' },
        { label: 'Referring domains', key: 'referring_domains' },
        { label: 'Referring main domains', key: 'referring_main_domains' },
        { label: 'Referring pages', key: 'referring_pages' },
        { label: 'Referring IPs', key: 'referring_ips' },
        { label: 'Referring subnets', key: 'referring_subnets' },
        { label: 'Domain rank (0–100)', key: 'rank' },
        { label: 'Target spam score', key: 'target_spam_score' },
        { label: 'Backlinks spam score', key: 'backlinks_spam_score' },
        { label: 'Broken backlinks', key: 'broken_backlinks' },
        { label: 'Broken pages', key: 'broken_pages' },
        { label: 'Crawled pages', key: 'crawled_pages' },
        { label: 'External links (site)', key: 'external_links_count' },
        { label: 'Internal links (site)', key: 'internal_links_count' },
        { label: 'First seen', key: 'first_seen' },
      ]
  return rows
    .map(({ label, key }) => ({ label, value: formatBacklinksMetric(summary[key]) }))
    .filter((r) => r.value !== '—')
}

export function backlinksPartialErrorNote(errors: Partial<Record<string, string>> | undefined): string {
  if (!errors) return ''
  const parts = Object.entries(errors).map(([k, v]) => `${k}: ${v}`)
  return parts.length ? `Partial results: ${parts.join(' · ')}` : ''
}

export function backlinksTotalCost(costs: Partial<Record<string, number>> | undefined): number {
  if (!costs) return 0
  return Object.values(costs).reduce((sum, x) => sum + (typeof x === 'number' ? x : 0), 0)
}

export function snapshotAgeDays(fetchedAt: string): number | null {
  const t = new Date(fetchedAt).getTime()
  if (Number.isNaN(t)) return null
  return (Date.now() - t) / (1000 * 60 * 60 * 24)
}
