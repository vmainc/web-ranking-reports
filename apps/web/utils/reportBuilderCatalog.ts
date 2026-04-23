import type { LibraryCatalogItem, ReportModuleType } from '~/types/reportBuilder'
import { REPORT_SECTION_IDS, REPORT_SECTION_LABELS, type ReportSectionId } from '~/utils/reportLayoutPresets'

/** Integration buckets for the builder module library accordions. */
export type ReportLibraryAccordionGroup = {
  id: string
  title: string
  /** Short hint under the accordion title. */
  subtitle?: string
  items: LibraryCatalogItem[]
}

const PAGE_STARTERS: LibraryCatalogItem[] = [
  {
    key: 'report_cover',
    type: 'report_cover',
    title: 'Title page',
    description: 'Logo, title, client, and date — logo defaults from report or site; editable in block settings.',
  },
  {
    key: 'table_of_contents',
    type: 'table_of_contents',
    title: 'Table of contents',
    description: 'Auto-lists other modules in order (skips extra cover/TOC blocks).',
  },
]

const DESIGNER_BLOCKS: LibraryCatalogItem[] = [
  {
    key: 'traffic_overview',
    type: 'traffic_overview',
    title: 'Traffic overview',
    description: 'Sessions, trends, and engagement snapshot for the reporting period.',
  },
  {
    key: 'conversions_summary',
    type: 'conversions_summary',
    title: 'Conversions summary',
    description: 'Goals, value, and optional channel breakdown.',
  },
  {
    key: 'ai_insights',
    type: 'ai_insights',
    title: 'AI insights',
    description: 'Narrative takeaways you can edit or replace before sharing.',
  },
  {
    key: 'notes',
    type: 'notes',
    title: 'Notes',
    description: 'Free-form notes or methodology for the client.',
  },
  {
    key: 'image_branding',
    type: 'image_branding',
    title: 'Image / branding',
    description: 'Hero image, headline, and subheadline for cover sections.',
  },
]

/** Same widgets as Full report / Weekly snapshot — one library row per section id. */
const CLASSIC_FULL_REPORT_BLOCKS: LibraryCatalogItem[] = REPORT_SECTION_IDS.map((id) => ({
  key: `classic_${id}`,
  type: 'full_report_section' as ReportModuleType,
  title: REPORT_SECTION_LABELS[id],
  description: 'Live data — same block as the classic full report for this site.',
  defaultSectionId: id,
}))

function designer(type: ReportModuleType): LibraryCatalogItem {
  const row = DESIGNER_BLOCKS.find((b) => b.type === type)
  if (!row) throw new Error(`Missing designer block: ${type}`)
  return row
}

function classicItems(...sectionIds: ReportSectionId[]): LibraryCatalogItem[] {
  const want = new Set(sectionIds)
  return CLASSIC_FULL_REPORT_BLOCKS.filter((b) => b.defaultSectionId && want.has(b.defaultSectionId))
}

const GA_ANALYTICS_SECTIONS: ReportSectionId[] = [
  'performance-summary',
  'sessions-trend',
  'traffic-channels',
  'top-countries',
  'top-pages',
  'landing-pages',
  'top-events',
  'ecommerce',
  'retention',
]

/**
 * Module library accordions — each group matches a product/integration area.
 * `REPORT_BUILDER_LIBRARY` is the flat concatenation (drag clone, search, etc.).
 */
export const REPORT_BUILDER_LIBRARY_GROUPS: ReportLibraryAccordionGroup[] = [
  {
    id: 'page_layout',
    title: 'Page layout',
    subtitle: 'Cover, contents, and structure',
    items: [...PAGE_STARTERS],
  },
  {
    id: 'google_analytics',
    title: 'Google Analytics',
    subtitle: 'Sessions, funnels, pages, and commerce in GA',
    items: [
      designer('traffic_overview'),
      designer('conversions_summary'),
      ...classicItems(...GA_ANALYTICS_SECTIONS),
    ],
  },
  {
    id: 'google_ads',
    title: 'Google Ads',
    subtitle: 'Spend, clicks, and conversions',
    items: classicItems('google-ads'),
  },
  {
    id: 'google_search_console',
    title: 'Google Search Console',
    subtitle: 'Queries, clicks, and impressions',
    items: classicItems('search-console'),
  },
  {
    id: 'lighthouse',
    title: 'Lighthouse',
    subtitle: 'Core Web Vitals and audits',
    items: classicItems('lighthouse'),
  },
  {
    id: 'woocommerce',
    title: 'WooCommerce',
    subtitle: 'Store orders and revenue',
    items: classicItems('woocommerce'),
  },
  {
    id: 'seo_rankings',
    title: 'SEO & rankings',
    subtitle: 'Rank tracking and backlink profile (classic report blocks)',
    items: [...classicItems('rank-tracking', 'backlinks')],
  },
  {
    id: 'site_audit',
    title: 'Site audit',
    subtitle: 'Crawl issues and on-page checks',
    items: classicItems('site-audit'),
  },
  {
    id: 'content_branding',
    title: 'Content & branding',
    subtitle: 'Narrative, notes, and visuals',
    items: [designer('ai_insights'), designer('notes'), designer('image_branding')],
  },
]

export const REPORT_BUILDER_LIBRARY: LibraryCatalogItem[] = REPORT_BUILDER_LIBRARY_GROUPS.flatMap((g) => g.items)

export function moduleTypeLabel(type: ReportModuleType): string {
  if (type === 'full_report_section') return 'Classic report section'
  if (type === 'report_cover') return 'Title page'
  if (type === 'table_of_contents') return 'Table of contents'
  if (type === 'keyword_rankings') return 'Keyword rankings'
  const row = PAGE_STARTERS.find((r) => r.type === type) ?? DESIGNER_BLOCKS.find((r) => r.type === type)
  return row?.title ?? type
}
