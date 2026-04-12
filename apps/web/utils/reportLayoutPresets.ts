/**
 * Full report section layout presets (used by full-report page, saved reports, and automated snapshots).
 */

export type ReportSectionConfig = {
  id: string
  title: string
  enabled: boolean
  order: number
}

export const LAYOUT_TEMPLATE_FULL = 'full'
export const LAYOUT_TEMPLATE_WEEKLY_SNAPSHOT = 'weekly_snapshot'
export const LAYOUT_TEMPLATE_CUSTOM = 'custom'

/** All valid section ids (for sanitizing saved templates). */
export const REPORT_SECTION_IDS = [
  'performance-summary',
  'sessions-trend',
  'traffic-channels',
  'top-countries',
  'top-pages',
  'landing-pages',
  'top-events',
  'ecommerce',
  'retention',
  'google-ads',
  'woocommerce',
  'lighthouse',
  'search-console',
  'site-audit',
  'rank-tracking',
  'backlinks',
] as const

export type ReportSectionId = (typeof REPORT_SECTION_IDS)[number]

const SECTION_TITLES: Record<string, string> = {
  'performance-summary': 'Performance summary',
  'sessions-trend': 'Sessions trend',
  'traffic-channels': 'Traffic channels',
  'top-countries': 'Top countries',
  'top-pages': 'Top pages',
  'landing-pages': 'Landing pages',
  'top-events': 'Top events',
  ecommerce: 'Ecommerce',
  retention: 'Retention',
  'google-ads': 'Google Ads',
  woocommerce: 'WooCommerce',
  lighthouse: 'Lighthouse',
  'search-console': 'Search Console',
  'site-audit': 'Site audit',
  'rank-tracking': 'Rank tracking',
  backlinks: 'Backlink analysis',
}

function sectionRow(id: ReportSectionId, order: number, enabled: boolean): ReportSectionConfig {
  return {
    id,
    title: SECTION_TITLES[id] ?? id,
    enabled,
    order,
  }
}

/** Default long-form report (all sections). Order matches the original full-report defaults. */
export function buildFullReportSections(woocommerceEnabled: boolean): ReportSectionConfig[] {
  const rows: ReportSectionConfig[] = [
    sectionRow('performance-summary', 1, true),
    sectionRow('sessions-trend', 2, true),
    sectionRow('traffic-channels', 3, true),
    sectionRow('top-countries', 4, true),
    sectionRow('top-pages', 5, true),
    sectionRow('landing-pages', 6, true),
    sectionRow('top-events', 7, true),
    sectionRow('ecommerce', 8, true),
    sectionRow('retention', 9, true),
    sectionRow('google-ads', 10, true),
  ]
  let o = 11
  if (woocommerceEnabled) {
    rows.push(sectionRow('woocommerce', o, true))
    o++
  }
  rows.push(sectionRow('lighthouse', o, true))
  o++
  rows.push(sectionRow('search-console', o, true))
  o++
  rows.push(sectionRow('site-audit', o, true))
  o++
  rows.push(sectionRow('rank-tracking', o, true))
  o++
  rows.push(sectionRow('backlinks', o, true))
  return rows
}

/**
 * “Weekly Snapshot” — overview-style modules plus rank tracking and cached backlink profile.
 */
export function buildWeeklySnapshotSections(woocommerceEnabled: boolean): ReportSectionConfig[] {
  const full = buildFullReportSections(woocommerceEnabled)
  const preferred: ReportSectionId[] = [
    'performance-summary',
    'lighthouse',
    'google-ads',
    'search-console',
  ]
  if (woocommerceEnabled) preferred.push('woocommerce')
  preferred.push('rank-tracking', 'backlinks')
  const preferredSet = new Set<string>(preferred)
  const out: ReportSectionConfig[] = []
  let order = 0
  for (const id of preferred) {
    const base = full.find((s) => s.id === id)
    if (base) {
      order++
      out.push({ ...base, enabled: true, order })
    }
  }
  for (const base of full) {
    if (preferredSet.has(base.id)) continue
    order++
    out.push({ ...base, enabled: false, order })
  }
  return out
}

/** Merge partial sections from storage against the canonical full layout (adds new ids, drops unknown). */
export function mergeReportSections(
  base: ReportSectionConfig[],
  partial: Partial<ReportSectionConfig>[],
): ReportSectionConfig[] {
  const known = new Set(REPORT_SECTION_IDS as unknown as string[])
  const merged = base.map((def) => {
    const override = partial.find((p) => p.id === def.id)
    return {
      ...def,
      enabled: override?.enabled ?? def.enabled,
      order: typeof override?.order === 'number' ? override.order : def.order,
    }
  })
  merged.sort((a, b) => a.order - b.order)
  merged.forEach((s, idx) => {
    s.order = idx + 1
  })
  return merged.filter((s) => known.has(s.id))
}

/** Sanitize user-saved template sections to known ids only. */
export function sanitizeTemplateSections(raw: unknown): Partial<ReportSectionConfig>[] | null {
  if (!Array.isArray(raw)) return null
  const known = new Set(REPORT_SECTION_IDS as unknown as string[])
  const out: Partial<ReportSectionConfig>[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const id = (item as { id?: unknown }).id
    if (typeof id !== 'string' || !known.has(id)) continue
    const enabled = (item as { enabled?: unknown }).enabled
    const order = (item as { order?: unknown }).order
    out.push({
      id,
      enabled: typeof enabled === 'boolean' ? enabled : undefined,
      order: typeof order === 'number' ? order : undefined,
    })
  }
  return out.length ? out : null
}
