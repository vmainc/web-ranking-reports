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

/** Human labels for full-report section ids (full report, weekly snapshot, builder “classic” blocks). */
export const REPORT_SECTION_LABELS: Record<ReportSectionId, string> = {
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
    title: REPORT_SECTION_LABELS[id] ?? id,
    enabled,
    order,
  }
}

/**
 * Classic section ids enabled by default in the Full report template.
 * Granular GA slices are legacy-only (use Traffic overview in the visual builder instead).
 */
const FULL_REPORT_DEFAULT_ENABLED: ReportSectionId[] = [
  'google-ads',
  'search-console',
  'lighthouse',
  'rank-tracking',
  'backlinks',
  'site-audit',
]

/** Default Full report layout for legacy `payload_json.sections` (old hydrations, layout templates). */
export function buildFullReportSections(woocommerceEnabled: boolean): ReportSectionConfig[] {
  const enabled = new Set<ReportSectionId>([...FULL_REPORT_DEFAULT_ENABLED])
  if (woocommerceEnabled) enabled.add('woocommerce')

  return REPORT_SECTION_IDS.map((id, idx) => sectionRow(id, idx + 1, enabled.has(id)))
}

/**
 * “Weekly Snapshot” — high-signal overview sections for scheduled / quick client updates.
 */
export function buildWeeklySnapshotSections(woocommerceEnabled: boolean): ReportSectionConfig[] {
  const enabled = new Set<ReportSectionId>([
    'performance-summary',
    'lighthouse',
    'google-ads',
    'search-console',
    'rank-tracking',
    'backlinks',
  ])
  if (woocommerceEnabled) enabled.add('woocommerce')

  return REPORT_SECTION_IDS.map((id, idx) => sectionRow(id, idx + 1, enabled.has(id)))
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
