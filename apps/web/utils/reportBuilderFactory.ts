import type {
  ReportModule,
  ReportModuleType,
  TrafficOverviewSettings,
  KeywordRankingsSettings,
  ConversionsSummarySettings,
  AIInsightsSettings,
  NotesSettings,
  ImageBrandingSettings,
  FullReportSectionSettings,
  ReportThemeSettings,
  ReportBuilderModel,
} from '~/types/reportBuilder'
import type { ReportSectionId } from '~/utils/reportLayoutPresets'
import { REPORT_SECTION_LABELS } from '~/utils/reportLayoutPresets'

export const DEFAULT_THEME: ReportThemeSettings = {
  primaryColor: '#2563eb',
  logoUrl: '',
  showCoverHeader: true,
}

const defaultTitles: Record<ReportModuleType, string> = {
  traffic_overview: 'Traffic overview',
  keyword_rankings: 'Keyword rankings',
  conversions_summary: 'Conversions summary',
  ai_insights: 'AI insights',
  notes: 'Notes',
  image_branding: 'Image & branding',
  full_report_section: 'Classic report section',
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
    case 'traffic_overview':
      return trafficDefaults()
    case 'keyword_rankings':
      return keywordDefaults()
    case 'conversions_summary':
      return conversionsDefaults()
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
    case 'traffic_overview':
      return { id, type, title, order, settings: settings as TrafficOverviewSettings }
    case 'keyword_rankings':
      return { id, type, title, order, settings: settings as KeywordRankingsSettings }
    case 'conversions_summary':
      return { id, type, title, order, settings: settings as ConversionsSummarySettings }
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

export function duplicateModule(modules: ReportModule[], moduleId: string): ReportModule[] {
  const i = modules.findIndex((m) => m.id === moduleId)
  if (i < 0) return modules
  const m = modules[i]!
  const copySettings = structuredClone(m.settings) as ReportModule['settings']
  const copy = { ...m, id: newModuleId(), title: `${m.title} (copy)`, settings: copySettings } as ReportModule
  const next = [...modules.slice(0, i + 1), copy, ...modules.slice(i + 1)]
  return normalizeModuleOrders(next)
}

export function emptyBuilderModel(reportId: string, titleFallback: string): ReportBuilderModel {
  return {
    id: reportId,
    title: titleFallback || 'Untitled report',
    subtitle: '',
    internalNotes: '',
    theme: { ...DEFAULT_THEME },
    modules: [],
  }
}
