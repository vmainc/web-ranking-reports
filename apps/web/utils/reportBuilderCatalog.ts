import type { LibraryCatalogItem, ReportModuleType } from '~/types/reportBuilder'
import { REPORT_SECTION_IDS, REPORT_SECTION_LABELS } from '~/utils/reportLayoutPresets'

const DESIGNER_BLOCKS: LibraryCatalogItem[] = [
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

/** Same widgets as Full report / Weekly snapshot — one library row per section id. */
const CLASSIC_FULL_REPORT_BLOCKS: LibraryCatalogItem[] = REPORT_SECTION_IDS.map((id) => ({
  key: `classic_${id}`,
  type: 'full_report_section' as ReportModuleType,
  title: REPORT_SECTION_LABELS[id],
  description: 'Live data — same block as the classic full report for this site.',
  defaultSectionId: id,
}))

export const REPORT_BUILDER_LIBRARY: LibraryCatalogItem[] = [...DESIGNER_BLOCKS, ...CLASSIC_FULL_REPORT_BLOCKS]

export function moduleTypeLabel(type: ReportModuleType): string {
  if (type === 'full_report_section') return 'Classic report section'
  const row = DESIGNER_BLOCKS.find((r) => r.type === type)
  return row?.title ?? type
}
