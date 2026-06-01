import type { Report } from '~/types'
import type {
  ReportBuilderModel,
  ReportCoverSettings,
  ReportModule,
  ReportModuleType,
  ReportPage,
  GoogleAdsKpiKey,
} from '~/types/reportBuilder'
import { GOOGLE_ADS_KPI_KEYS, REPORT_BUILDER_PAYLOAD_KEY } from '~/types/reportBuilder'
import { REPORT_SECTION_IDS, type ReportSectionId } from '~/utils/reportLayoutPresets'
import type { ModuleLayoutWidth } from '~/types/reportBuilder'
import {
  emptyBuilderModel,
  defaultSettingsForType,
  newModuleId,
  newReportPageId,
  normalizeModuleOrders,
  normalizePageOrders,
  createModule,
  createDefaultDocumentPages,
} from '~/utils/reportBuilderFactory'
import { mergeDeliveryEmailSettings } from '~/utils/reportDeliveryEmail'
import type { ReportDeliveryEmailSettings } from '~/types/reportBuilder'

function modulesFromLegacyReportSections(sections: unknown): ReportModule[] {
  if (!Array.isArray(sections)) return []
  const known = new Set(REPORT_SECTION_IDS as readonly string[])
  const rows = sections
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object' && !Array.isArray(row))
    .filter((row) => typeof row.id === 'string' && known.has(row.id))
    .filter((row) => row.enabled !== false)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
  return normalizeModuleOrders(
    rows.map((row, idx) =>
      createModule('full_report_section', idx, { sectionId: row.id as ReportSectionId }),
    ),
  )
}

/**
 * Legacy full-report templates stored as `payload_json.sections` were flat.
 * In the page-based builder we place each classic section on its own page
 * so modules don't get crammed into one sheet.
 */
function pagesFromLegacyReportSections(sections: unknown): ReportPage[] {
  const frontMatter = createDefaultDocumentPages('').slice(0, 2)
  const modules = modulesFromLegacyReportSections(sections)
  if (!modules.length) {
    return createDefaultDocumentPages('')
  }
  const bodyPages: ReportPage[] = modules.map((m, idx) => ({
    id: newReportPageId(),
    title: m.title?.trim() || `Section ${idx + 1}`,
    order: idx + frontMatter.length,
    modules: normalizeModuleOrders([{ ...m, order: 0 }]),
  }))
  return normalizePageOrders([...frontMatter, ...bodyPages])
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function sanitizeStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out = raw.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim())
  return out.length ? out : undefined
}

function coerceType(t: unknown): ReportModuleType | null {
  const allowed: ReportModuleType[] = [
    'report_cover',
    'table_of_contents',
    'traffic_overview',
    'keyword_rankings',
    'conversions_summary',
    'google_ads_clicks',
    'local_services_ads',
    'backlinks',
    'ai_insights',
    'notes',
    'image_branding',
    'full_report_section',
  ]
  return typeof t === 'string' && (allowed as string[]).includes(t) ? (t as ReportModuleType) : null
}

function coerceSectionId(v: unknown): ReportSectionId {
  if (typeof v === 'string' && (REPORT_SECTION_IDS as readonly string[]).includes(v)) {
    return v as ReportSectionId
  }
  return 'performance-summary'
}

function reviveModule(raw: unknown, fallbackOrder: number): ReportModule | null {
  if (!isRecord(raw)) return null
  const type = coerceType(raw.type)
  if (!type) return null
  const id = typeof raw.id === 'string' && raw.id ? raw.id : newModuleId()
  const title = typeof raw.title === 'string' ? raw.title : 'Module'
  const order = typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : fallbackOrder
  const settingsRaw = raw.settings
  const defaults = defaultSettingsForType(type)
  let settings: ReportModule['settings'] =
    isRecord(settingsRaw) && Object.keys(settingsRaw).length
      ? ({ ...defaults, ...settingsRaw } as ReportModule['settings'])
      : defaults
  if (type === 'full_report_section') {
    const merged = { ...defaults, ...(isRecord(settingsRaw) ? settingsRaw : {}) } as Record<string, unknown>
    const kpRaw = merged.googleAdsKpis
    let googleAdsKpis: Partial<Record<GoogleAdsKpiKey, boolean>> | undefined
    if (isRecord(kpRaw)) {
      const out: Partial<Record<GoogleAdsKpiKey, boolean>> = {}
      for (const k of GOOGLE_ADS_KPI_KEYS) {
        if (typeof kpRaw[k] === 'boolean') out[k] = kpRaw[k] as boolean
      }
      if (Object.keys(out).length) googleAdsKpis = out
    }
    settings = {
      sectionId: coerceSectionId(merged.sectionId),
      rangePreset:
        merged.rangePreset === 'last_7_days' || merged.rangePreset === 'last_90_days' || merged.rangePreset === 'last_28_days'
          ? merged.rangePreset
          : (defaults as { rangePreset: string }).rangePreset,
      compareToPrevious: typeof merged.compareToPrevious === 'boolean' ? merged.compareToPrevious : true,
      rankKeywordIncludeIds: sanitizeStringArray(merged.rankKeywordIncludeIds),
      rankKeywordExcludeIds: sanitizeStringArray(merged.rankKeywordExcludeIds),
      ...(googleAdsKpis ? { googleAdsKpis } : {}),
    } as ReportModule['settings']
  }
  if (type === 'backlinks') {
    const merged = { ...defaults, ...(isRecord(settingsRaw) ? settingsRaw : {}) } as Record<string, unknown>
    const d = defaults as { autoRefresh: boolean; maxAgeDays: number }
    const maxAge = Number(merged.maxAgeDays)
    settings = {
      autoRefresh: typeof merged.autoRefresh === 'boolean' ? merged.autoRefresh : d.autoRefresh,
      maxAgeDays: Number.isFinite(maxAge) && maxAge > 0 ? Math.min(365, Math.round(maxAge)) : d.maxAgeDays,
    } as ReportModule['settings']
  }
  if (type === 'google_ads_clicks' || type === 'local_services_ads') {
    const merged = { ...defaults, ...(isRecord(settingsRaw) ? settingsRaw : {}) } as Record<string, unknown>
    const d = defaults as { rangePreset: string; compareToPrevious: boolean }
    settings = {
      rangePreset:
        merged.rangePreset === 'last_7_days' || merged.rangePreset === 'last_90_days' || merged.rangePreset === 'last_28_days'
          ? merged.rangePreset
          : d.rangePreset,
      compareToPrevious: typeof merged.compareToPrevious === 'boolean' ? merged.compareToPrevious : d.compareToPrevious,
    } as ReportModule['settings']
  }
  if (type === 'report_cover') {
    const merged = { ...defaults, ...(isRecord(settingsRaw) ? settingsRaw : {}) } as Record<string, unknown>
    const d = defaults as ReportCoverSettings
    settings = {
      tagline: typeof merged.tagline === 'string' ? merged.tagline : d.tagline,
      showLogo: typeof merged.showLogo === 'boolean' ? merged.showLogo : true,
      logoOverrideUrl: typeof merged.logoOverrideUrl === 'string' ? merged.logoOverrideUrl : (d.logoOverrideUrl ?? ''),
    } as ReportModule['settings']
  }
  if (type === 'table_of_contents') {
    const merged = { ...defaults, ...(isRecord(settingsRaw) ? settingsRaw : {}) } as Record<string, unknown>
    settings = {
      showPageLabels: typeof merged.showPageLabels === 'boolean' ? merged.showPageLabels : true,
    } as ReportModule['settings']
  }

  const lw = (raw as { layoutWidth?: unknown }).layoutWidth
  const layoutWidth =
    lw === 'full' || lw === 'half' || lw === 'third' ? (lw as ModuleLayoutWidth) : undefined
  const pageBreakBefore =
    typeof (raw as { pageBreakBefore?: unknown }).pageBreakBefore === 'boolean'
      ? (raw as { pageBreakBefore: boolean }).pageBreakBefore
      : undefined

  return { id, type, title, order, layoutWidth, pageBreakBefore, settings } as ReportModule
}

function revivePage(raw: unknown, fallbackOrder: number): ReportPage | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' && raw.id ? raw.id : newReportPageId()
  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'Page'
  const order = typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : fallbackOrder
  let modules: ReportModule[] = []
  if (Array.isArray(raw.modules)) {
    modules = raw.modules
      .map((row, i) => reviveModule(row, i))
      .filter((m): m is ReportModule => m !== null)
    modules = normalizeModuleOrders(modules)
  }
  return { id, title, order, modules }
}

function reviveTheme(raw: unknown): ReportBuilderModel['theme'] {
  const base = emptyBuilderModel('', '').theme
  if (!isRecord(raw)) return base
  return {
    primaryColor: typeof raw.primaryColor === 'string' ? raw.primaryColor : base.primaryColor,
    logoUrl: typeof raw.logoUrl === 'string' ? raw.logoUrl : base.logoUrl,
    showCoverHeader: typeof raw.showCoverHeader === 'boolean' ? raw.showCoverHeader : base.showCoverHeader,
  }
}

function reviveDeliveryEmail(raw: unknown): ReportDeliveryEmailSettings {
  return mergeDeliveryEmailSettings(isRecord(raw) ? (raw as Partial<ReportDeliveryEmailSettings>) : null)
}

function serializeModule(m: ReportModule): Record<string, unknown> {
  return {
    id: m.id,
    type: m.type,
    title: m.title,
    order: m.order,
    layoutWidth: m.layoutWidth,
    pageBreakBefore: m.pageBreakBefore === true ? true : undefined,
    settings: m.settings,
  }
}

/**
 * Hydrates a persisted `payload_json.reportBuilder` blob (or returns a fresh model).
 */
export function hydrateReportBuilder(report: Report & { payload_json?: Record<string, unknown> }): ReportBuilderModel {
  const nameFromPayload =
    typeof report.payload_json?.name === 'string' ? (report.payload_json.name as string).trim() : ''
  const titleFallback = nameFromPayload || `Report ${report.id.slice(0, 8)}`

  const raw = report.payload_json?.[REPORT_BUILDER_PAYLOAD_KEY]
  if (!isRecord(raw)) {
    const legacy = (report.payload_json as { sections?: unknown } | undefined)?.sections
    if (Array.isArray(legacy) && legacy.length > 0) {
      return {
        id: report.id,
        title: titleFallback,
        subtitle: undefined,
        internalNotes: undefined,
        theme: emptyBuilderModel(report.id, '').theme,
        pages: pagesFromLegacyReportSections(legacy),
      }
    }
    return emptyBuilderModel(report.id, titleFallback)
  }

  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title : titleFallback
  const subtitle = typeof raw.subtitle === 'string' ? raw.subtitle : undefined
  const internalNotes = typeof raw.internalNotes === 'string' ? raw.internalNotes : undefined
  const theme = reviveTheme(raw.theme)
  const deliveryEmail = reviveDeliveryEmail(raw.deliveryEmail)

  let pages: ReportPage[] = []
  if (Array.isArray(raw.pages) && raw.pages.length > 0) {
    pages = raw.pages
      .map((row, i) => revivePage(row, i))
      .filter((p): p is ReportPage => p !== null)
    pages = normalizePageOrders(pages)
  }
  if (pages.length === 0 && Array.isArray(raw.modules) && raw.modules.length > 0) {
    const modules = raw.modules
      .map((row, i) => reviveModule(row, i))
      .filter((m): m is ReportModule => m !== null)
    const normalized = normalizeModuleOrders(modules)
    const frontMatter = createDefaultDocumentPages('').slice(0, 2)
    const bodyPages = normalized.map((m, idx) => ({
      id: newReportPageId(),
      title: m.title?.trim() || `Section ${idx + 1}`,
      order: idx + frontMatter.length,
      modules: normalizeModuleOrders([{ ...m, order: 0 }]),
    }))
    pages = normalizePageOrders([...frontMatter, ...bodyPages])
  }
  if (pages.length === 0) {
    pages = createDefaultDocumentPages(title)
  }

  pages = pages
    .map((p) => ({
      ...p,
      modules: p.modules.filter((m) => (m.type as string) !== 'cloudflare'),
    }))
    .filter((p) => p.modules.length > 0)
  if (pages.length === 0) {
    pages = createDefaultDocumentPages(title)
  }

  return {
    id: report.id,
    title,
    subtitle,
    internalNotes,
    theme,
    deliveryEmail,
    pages,
  }
}

/**
 * Serializes builder state for PATCH `payload_json` merge (caller merges with existing payload).
 */
export function serializeReportBuilder(model: ReportBuilderModel): Record<string, unknown> {
  return {
    [REPORT_BUILDER_PAYLOAD_KEY]: {
      title: model.title,
      subtitle: model.subtitle ?? '',
      internalNotes: model.internalNotes ?? '',
      theme: model.theme,
      deliveryEmail: model.deliveryEmail,
      pages: model.pages.map((p) => ({
        id: p.id,
        title: p.title,
        order: p.order,
        modules: p.modules.map((m) => serializeModule(m)),
      })),
    },
    /** Keep list + PDF naming in sync with builder title. */
    name: model.title,
  }
}
