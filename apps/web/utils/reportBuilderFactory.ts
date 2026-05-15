import type {
  ReportModule,
  ReportModuleType,
  ReportPage,
  TrafficOverviewSettings,
  KeywordRankingsSettings,
  ConversionsSummarySettings,
  AIInsightsSettings,
  NotesSettings,
  ImageBrandingSettings,
  FullReportSectionSettings,
  GoogleAdsClicksSettings,
  ReportThemeSettings,
  ReportBuilderModel,
  ReportCoverSettings,
  TableOfContentsSettings,
} from '~/types/reportBuilder'
import type { ReportSectionId } from '~/utils/reportLayoutPresets'
import { REPORT_SECTION_LABELS } from '~/utils/reportLayoutPresets'

export const DEFAULT_THEME: ReportThemeSettings = {
  primaryColor: '#2563eb',
  logoUrl: '',
  showCoverHeader: true,
}

const defaultTitles: Record<ReportModuleType, string> = {
  report_cover: 'Title page',
  table_of_contents: 'Table of contents',
  traffic_overview: 'Traffic overview',
  keyword_rankings: 'Keyword rankings',
  conversions_summary: 'Conversions summary',
  google_ads_clicks: 'Google Ads · clicks over time',
  ai_insights: 'AI insights',
  notes: 'Notes',
  image_branding: 'Image & branding',
  full_report_section: 'Classic report section',
}

function coverDefaults(): ReportCoverSettings {
  return { tagline: '', showLogo: true, logoOverrideUrl: '' }
}

function tocDefaults(): TableOfContentsSettings {
  return { showPageLabels: true }
}

function trafficDefaults(): TrafficOverviewSettings {
  return {
    dateRange: 'last_28_days',
    comparisonEnabled: true,
    showChart: true,
    showTotals: true,
  }
}

function keywordDefaults(): KeywordRankingsSettings {
  return {
    keywordGroupName: 'Primary keywords',
    maxKeywords: 10,
    showChangeColumn: true,
    showCurrentRank: true,
  }
}

function conversionsDefaults(): ConversionsSummarySettings {
  return {
    dateRange: 'last_28_days',
    comparisonEnabled: true,
    showConversionValue: true,
    showSourceBreakdown: false,
  }
}

function googleAdsClicksDefaults(): GoogleAdsClicksSettings {
  return {
    rangePreset: 'last_28_days',
    compareToPrevious: true,
  }
}

function aiDefaults(): AIInsightsSettings {
  return {
    body:
      'Organic sessions are trending positively week over week. Consider prioritizing pages that already rank on page two—they may be the fastest wins for incremental traffic.',
    tone: 'professional',
  }
}

function notesDefaults(): NotesSettings {
  return {
    title: 'Executive summary',
    body:
      'Use this block for context, methodology, or client-specific commentary. Everything here is saved with the report layout.',
  }
}

function imageDefaults(): ImageBrandingSettings {
  return {
    imageUrl: '',
    headline: 'Your agency name',
    subheadline: 'Prepared for {{ client }} · {{ period }}',
    alignment: 'center',
  }
}

function fullReportSectionDefaults(sectionId: ReportSectionId): FullReportSectionSettings {
  return {
    sectionId,
    rangePreset: 'last_28_days',
    compareToPrevious: true,
  }
}

export function defaultSettingsForType(type: ReportModuleType): ReportModule['settings'] {
  switch (type) {
    case 'report_cover':
      return coverDefaults()
    case 'table_of_contents':
      return tocDefaults()
    case 'traffic_overview':
      return trafficDefaults()
    case 'keyword_rankings':
      return keywordDefaults()
    case 'conversions_summary':
      return conversionsDefaults()
    case 'google_ads_clicks':
      return googleAdsClicksDefaults()
    case 'ai_insights':
      return aiDefaults()
    case 'notes':
      return notesDefaults()
    case 'image_branding':
      return imageDefaults()
    case 'full_report_section':
      return fullReportSectionDefaults('performance-summary')
  }
}

export type CreateModuleOptions = {
  /** For `full_report_section` — which classic block to show. */
  sectionId?: ReportSectionId
}

export function newModuleId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function newReportPageId(): string {
  return `pg_${newModuleId()}`
}

export function normalizePageOrders(pages: ReportPage[]): ReportPage[] {
  return pages.map((p, i) => ({ ...p, order: i }))
}

export function createDefaultDocumentPages(_reportTitle: string): ReportPage[] {
  const cover = createModule('report_cover', 0)
  const toc = createModule('table_of_contents', 0)
  return normalizePageOrders([
    {
      id: newReportPageId(),
      title: 'Title page',
      order: 0,
      modules: normalizeModuleOrders([cover]),
    },
    {
      id: newReportPageId(),
      title: 'Contents',
      order: 1,
      modules: normalizeModuleOrders([toc]),
    },
    {
      id: newReportPageId(),
      title: 'Report body',
      order: 2,
      modules: [],
    },
  ])
}

/** One content page holding migrated flat `modules` (cover + TOC prepended). */
export function wrapFlatModulesInDocumentPages(modules: ReportModule[]): ReportPage[] {
  const body = normalizePageOrders(modules)
  const front = createDefaultDocumentPages('').slice(0, 2)
  return normalizePageOrders([
    ...front,
    {
      id: newReportPageId(),
      title: 'Report body',
      order: 2,
      modules: body,
    },
  ])
}

export function createModule(type: ReportModuleType, order: number, opts?: CreateModuleOptions): ReportModule {
  const id = newModuleId()
  const sectionId = opts?.sectionId
  let title = defaultTitles[type]
  let settings = defaultSettingsForType(type)
  if (type === 'full_report_section' && sectionId) {
    settings = fullReportSectionDefaults(sectionId)
    title = REPORT_SECTION_LABELS[sectionId] ?? defaultTitles.full_report_section
  }
  switch (type) {
    case 'report_cover':
      return { id, type, title, order, settings: settings as ReportCoverSettings }
    case 'table_of_contents':
      return { id, type, title, order, settings: settings as TableOfContentsSettings }
    case 'traffic_overview':
      return { id, type, title, order, settings: settings as TrafficOverviewSettings }
    case 'keyword_rankings':
      return { id, type, title, order, settings: settings as KeywordRankingsSettings }
    case 'conversions_summary':
      return { id, type, title, order, settings: settings as ConversionsSummarySettings }
    case 'google_ads_clicks':
      return { id, type, title, order, settings: settings as GoogleAdsClicksSettings }
    case 'ai_insights':
      return { id, type, title, order, settings: settings as AIInsightsSettings }
    case 'notes':
      return { id, type, title, order, settings: settings as NotesSettings }
    case 'image_branding':
      return { id, type, title, order, settings: settings as ImageBrandingSettings }
    case 'full_report_section':
      return { id, type, title, order, settings: settings as FullReportSectionSettings }
  }
}

export function normalizeModuleOrders(modules: ReportModule[]): ReportModule[] {
  return modules.map((m, i) => ({ ...m, order: i }))
}

export function duplicateModule(pages: ReportPage[], moduleId: string): ReportPage[] {
  const next = pages.map((p) => ({ ...p, modules: [...p.modules] }))
  for (const p of next) {
    const i = p.modules.findIndex((m) => m.id === moduleId)
    if (i < 0) continue
    const m = p.modules[i]!
    const copySettings = structuredClone(m.settings) as ReportModule['settings']
    const copy = { ...m, id: newModuleId(), title: `${m.title} (copy)`, settings: copySettings } as ReportModule
    p.modules = normalizeModuleOrders([...p.modules.slice(0, i + 1), copy, ...p.modules.slice(i + 1)])
    return normalizePageOrders(next)
  }
  return normalizePageOrders(pages)
}

export function emptyBuilderModel(reportId: string, titleFallback: string): ReportBuilderModel {
  return {
    id: reportId,
    title: titleFallback || 'Untitled report',
    subtitle: '',
    internalNotes: '',
    theme: { ...DEFAULT_THEME },
    pages: createDefaultDocumentPages(titleFallback),
  }
}

type FullReportPageDef = { title: string; modules: ReportModule[] }

/**
 * Visual builder pages for the “Full report” starting template — aligned with current integrations
 * (Traffic overview, Ads, GSC, Lighthouse, rank/backlinks, optional Woo).
 */
export function buildFullReportPages(reportTitle: string, woocommerceEnabled: boolean): ReportPage[] {
  const front = createDefaultDocumentPages(reportTitle).slice(0, 2)
  const bodyDefs: FullReportPageDef[] = [
    { title: 'Traffic overview', modules: [createModule('traffic_overview', 0)] },
    { title: 'Conversions', modules: [createModule('conversions_summary', 0)] },
    { title: 'Google Ads', modules: [createModule('google_ads_clicks', 0)] },
    {
      title: REPORT_SECTION_LABELS['search-console'],
      modules: [createModule('full_report_section', 0, { sectionId: 'search-console' })],
    },
    {
      title: REPORT_SECTION_LABELS.lighthouse,
      modules: [createModule('full_report_section', 0, { sectionId: 'lighthouse' })],
    },
    {
      title: REPORT_SECTION_LABELS['rank-tracking'],
      modules: [createModule('full_report_section', 0, { sectionId: 'rank-tracking' })],
    },
    {
      title: REPORT_SECTION_LABELS.backlinks,
      modules: [createModule('full_report_section', 0, { sectionId: 'backlinks' })],
    },
  ]

  if (woocommerceEnabled) {
    bodyDefs.push({
      title: REPORT_SECTION_LABELS.woocommerce,
      modules: [createModule('full_report_section', 0, { sectionId: 'woocommerce' })],
    })
  }

  bodyDefs.push(
    {
      title: REPORT_SECTION_LABELS['site-audit'],
      modules: [createModule('full_report_section', 0, { sectionId: 'site-audit' })],
    },
    { title: 'Insights', modules: [createModule('ai_insights', 0)] },
  )

  const bodyPages: ReportPage[] = bodyDefs.map((def, idx) => ({
    id: newReportPageId(),
    title: def.title,
    order: front.length + idx,
    modules: normalizeModuleOrders(def.modules),
  }))

  return normalizePageOrders([...front, ...bodyPages])
}
