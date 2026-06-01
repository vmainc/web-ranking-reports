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

export const DATAFORSEO_BACKLINKS_SUBSCRIPTION_URL = 'https://app.dataforseo.com/backlinks-subscription'

/** DataForSEO Backlinks API is a separate product from SERP / keyword volume. */
export function isBacklinksSubscriptionError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('backlinks-subscription') ||
    (m.includes('access denied') && m.includes('backlinks')) ||
    (m.includes('activate your subscription') && m.includes('backlinks'))
  )
}

export type BacklinksUserErrorDisplay = {
  kind: 'subscription' | 'partial' | 'none'
  message: string
  subscriptionUrl: string | null
}

export function formatBacklinksErrorsForUser(
  errors: Partial<Record<string, string>> | undefined,
): BacklinksUserErrorDisplay {
  if (!errors || !Object.keys(errors).length) {
    return { kind: 'none', message: '', subscriptionUrl: null }
  }

  const values = [...new Set(Object.values(errors).filter((v): v is string => !!v?.trim()))]
  if (values.length === 1 && isBacklinksSubscriptionError(values[0]!)) {
    return {
      kind: 'subscription',
      subscriptionUrl: DATAFORSEO_BACKLINKS_SUBSCRIPTION_URL,
      message:
        'Your DataForSEO login works for rank tracking, but the Backlinks API is not enabled on your account. Enable the Backlinks subscription in DataForSEO (same login as Admin → Integrations), then try again.',
    }
  }

  if (values.every((v) => isBacklinksSubscriptionError(v))) {
    return {
      kind: 'subscription',
      subscriptionUrl: DATAFORSEO_BACKLINKS_SUBSCRIPTION_URL,
      message:
        'Backlinks data is unavailable because the DataForSEO Backlinks API is not active on your subscription.',
    }
  }

  const parts = Object.entries(errors).map(([k, v]) => `${k}: ${v}`)
  return {
    kind: 'partial',
    subscriptionUrl: null,
    message: `Some sections could not be loaded: ${parts.join(' · ')}`,
  }
}

/** @deprecated Use formatBacklinksErrorsForUser */
export function backlinksPartialErrorNote(errors: Partial<Record<string, string>> | undefined): string {
  const f = formatBacklinksErrorsForUser(errors)
  if (f.kind === 'none') return ''
  return f.kind === 'subscription' ? f.message : `Partial results: ${f.message.replace(/^Some sections could not be loaded: /, '')}`
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
