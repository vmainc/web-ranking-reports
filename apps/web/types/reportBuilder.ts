import type { ReportSectionId } from '~/utils/reportLayoutPresets'

/** PocketBase `reports.payload_json` key for the visual builder document. */
export const REPORT_BUILDER_PAYLOAD_KEY = 'reportBuilder' as const

export type ReportModuleType =
  | 'traffic_overview'
  | 'keyword_rankings'
  | 'conversions_summary'
  | 'ai_insights'
  | 'notes'
  | 'image_branding'
  | 'full_report_section'

/** Reserved for future grid columns (full / half / third). */
export type ModuleLayoutWidth = 'full' | 'half' | 'third'

export interface ReportThemeSettings {
  primaryColor: string
  logoUrl?: string
  showCoverHeader: boolean
}

export interface TrafficOverviewSettings {
  dateRange: string
  comparisonEnabled: boolean
  showChart: boolean
  showTotals: boolean
}

export interface KeywordRankingsSettings {
  keywordGroupName: string
  maxKeywords: number
  showChangeColumn: boolean
  showCurrentRank: boolean
}

export interface ConversionsSummarySettings {
  dateRange: string
  comparisonEnabled: boolean
  showConversionValue: boolean
  showSourceBreakdown: boolean
}

export type AIInsightsTone = 'professional' | 'friendly' | 'concise'

export interface AIInsightsSettings {
  body: string
  tone: AIInsightsTone
}

export interface NotesSettings {
  title: string
  body: string
}

export type ImageBrandingAlignment = 'left' | 'center' | 'right'

export interface ImageBrandingSettings {
  imageUrl: string
  headline: string
  subheadline: string
  alignment: ImageBrandingAlignment
}

/** Same widgets as the classic full report / weekly snapshot for one section id. */
export interface FullReportSectionSettings {
  sectionId: ReportSectionId
  /** GA date range; matches full-report query `range`. */
  rangePreset: 'last_7_days' | 'last_28_days' | 'last_90_days'
  /** When true, compare to previous period (full-report `compare=previous_period`). */
  compareToPrevious: boolean
}

export type ModuleSettingsByType = {
  traffic_overview: TrafficOverviewSettings
  keyword_rankings: KeywordRankingsSettings
  conversions_summary: ConversionsSummarySettings
  ai_insights: AIInsightsSettings
  notes: NotesSettings
  image_branding: ImageBrandingSettings
  full_report_section: FullReportSectionSettings
}

type ModuleCore<T extends ReportModuleType> = {
  id: string
  type: T
  title: string
  order: number
  layoutWidth?: ModuleLayoutWidth
  settings: ModuleSettingsByType[T]
}

export type ReportModule =
  | ModuleCore<'traffic_overview'>
  | ModuleCore<'keyword_rankings'>
  | ModuleCore<'conversions_summary'>
  | ModuleCore<'ai_insights'>
  | ModuleCore<'notes'>
  | ModuleCore<'image_branding'>
  | ModuleCore<'full_report_section'>

export interface ReportBuilderModel {
  id: string
  title: string
  subtitle?: string
  internalNotes?: string
  theme: ReportThemeSettings
  modules: ReportModule[]
}

export type LibraryCatalogItem = {
  key: string
  type: ReportModuleType
  title: string
  description: string
  /** When adding `full_report_section`, seed `settings.sectionId`. */
  defaultSectionId?: ReportSectionId
}
