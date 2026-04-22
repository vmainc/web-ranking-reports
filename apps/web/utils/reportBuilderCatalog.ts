import type { LibraryCatalogItem, ReportModuleType } from '~/types/reportBuilder'

export const REPORT_BUILDER_LIBRARY: LibraryCatalogItem[] = [
  {
    key: 'traffic_overview',
    type: 'traffic_overview',
    title: 'Traffic overview',
    description: 'Sessions, trends, and engagement snapshot for the reporting period.',
  },
  {
    key: 'keyword_rankings',
    type: 'keyword_rankings',
    title: 'Keyword rankings',
    description: 'Rank movement table for a keyword group.',
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

export function moduleTypeLabel(type: ReportModuleType): string {
  const row = REPORT_BUILDER_LIBRARY.find((r) => r.type === type)
  return row?.title ?? type
}
