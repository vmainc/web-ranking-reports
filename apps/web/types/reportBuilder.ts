import type { ReportSectionId } from '~/utils/reportLayoutPresets'

/** Classic Google Ads section — six KPI tiles (visibility controlled in module settings). */
export const GOOGLE_ADS_KPI_KEYS = ['cost', 'conversions', 'clicks', 'convRate', 'impressions', 'ctr'] as const
export type GoogleAdsKpiKey = (typeof GOOGLE_ADS_KPI_KEYS)[number]

export function mergeGoogleAdsKpiVisibility(
  partial?: Partial<Record<GoogleAdsKpiKey, boolean>>,
): Record<GoogleAdsKpiKey, boolean> {
  const base: Record<GoogleAdsKpiKey, boolean> = {
    cost: true,
    conversions: true,
    clicks: true,
    convRate: true,
    impressions: true,
    ctr: true,
  }
  if (!partial) return base
  for (const k of GOOGLE_ADS_KPI_KEYS) {
    if (typeof partial[k] === 'boolean') base[k] = partial[k]!
  }
  return base
}

/** PocketBase `reports.payload_json` key for the visual builder document. */
export const REPORT_BUILDER_PAYLOAD_KEY = 'reportBuilder' as const

export type ReportModuleType =
  | 'report_cover'
  | 'table_of_contents'
  | 'traffic_overview'
  | 'keyword_rankings'
  | 'conversions_summary'
  | 'google_ads_clicks'
  | 'local_services_ads'
  | 'backlinks'
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

/** Email sent to clients with the report PDF (builder → Report settings). */
export interface ReportDeliveryEmailSettings {
  subject: string
  body: string
  logoUrl: string
  showLogo: boolean
  showOpenLink: boolean
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

/** Daily Google Ads clicks line chart — same date presets as classic report sections. */
export interface GoogleAdsClicksSettings {
  rangePreset: 'last_7_days' | 'last_28_days' | 'last_90_days'
  compareToPrevious: boolean
}

/** Local Service Ads summary — same date presets as Google Ads clicks module. */
export type LocalServicesAdsSettings = GoogleAdsClicksSettings

export interface BacklinksSettings {
  /** Fetch from DataForSEO when cache is empty or older than maxAgeDays. */
  autoRefresh: boolean
  maxAgeDays: number
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

/** Printable cover — uses report title / subtitle from document settings. */
export interface ReportCoverSettings {
  /** Optional line above the title (e.g. agency name). */
  tagline: string
  /** When false, no logo area is shown (user can turn off entirely). */
  showLogo?: boolean
  /**
   * Cover-only logo URL. When empty, the cover uses report theme logo, then site logo, then a built-in placeholder.
   */
  logoOverrideUrl?: string
}

export interface TableOfContentsSettings {
  /** When true, append each entry with the page name it lives on. */
  showPageLabels: boolean
}

/** Same widgets as the classic full report / weekly snapshot for one section id. */
export interface FullReportSectionSettings {
  sectionId: ReportSectionId
  /** GA date range; matches full-report query `range`. */
  rangePreset: 'last_7_days' | 'last_28_days' | 'last_90_days'
  /** When true, compare to previous period (full-report `compare=previous_period`). */
  compareToPrevious: boolean
  /** When `sectionId` is `google-ads`, which KPI tiles to show (omitted = all on). */
  googleAdsKpis?: Partial<Record<GoogleAdsKpiKey, boolean>>
  /**
   * Optional include/exclude controls for rank-tracking report output.
   * If `rankKeywordIncludeIds` is non-empty, only those ids are shown.
   * `rankKeywordExcludeIds` always removes matching ids.
   */
  rankKeywordIncludeIds?: string[]
  rankKeywordExcludeIds?: string[]
}

export type ModuleSettingsByType = {
  report_cover: ReportCoverSettings
  table_of_contents: TableOfContentsSettings
  traffic_overview: TrafficOverviewSettings
  keyword_rankings: KeywordRankingsSettings
  conversions_summary: ConversionsSummarySettings
  google_ads_clicks: GoogleAdsClicksSettings
  local_services_ads: LocalServicesAdsSettings
  backlinks: BacklinksSettings
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
  /** When true, print/PDF starts this block on a new page (see report preview). */
  pageBreakBefore?: boolean
  settings: ModuleSettingsByType[T]
}

export type ReportModule =
  | ModuleCore<'report_cover'>
  | ModuleCore<'table_of_contents'>
  | ModuleCore<'traffic_overview'>
  | ModuleCore<'keyword_rankings'>
  | ModuleCore<'conversions_summary'>
  | ModuleCore<'google_ads_clicks'>
  | ModuleCore<'local_services_ads'>
  | ModuleCore<'backlinks'>
  | ModuleCore<'ai_insights'>
  | ModuleCore<'notes'>
  | ModuleCore<'image_branding'>
  | ModuleCore<'full_report_section'>

/** One PDF / print page: a vertical stack of modules that should not split across sheet boundaries. */
export interface ReportPage {
  id: string
  /** Shown in the builder and optional TOC labels. */
  title: string
  order: number
  modules: ReportModule[]
}

export interface ReportBuilderModel {
  id: string
  title: string
  subtitle?: string
  internalNotes?: string
  theme: ReportThemeSettings
  deliveryEmail: ReportDeliveryEmailSettings
  pages: ReportPage[]
}

export type LibraryCatalogItem = {
  key: string
  type: ReportModuleType
  title: string
  description: string
  /** When adding `full_report_section`, seed `settings.sectionId`. */
  defaultSectionId?: ReportSectionId
}
