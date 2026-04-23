import type { Report } from '~/types'
import type {
  ReportBuilderModel,
  ReportCoverSettings,
  ReportModule,
  ReportModuleType,
  ReportPage,
} from '~/types/reportBuilder'
import { REPORT_BUILDER_PAYLOAD_KEY } from '~/types/reportBuilder'
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
  wrapFlatModulesInDocumentPages,
  createDefaultDocumentPages,
} from '~/utils/reportBuilderFactory'

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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function coerceType(t: unknown): ReportModuleType | null {
  const allowed: ReportModuleType[] = [
    'report_cover',
    'table_of_contents',
    'traffic_overview',
    'keyword_rankings',
    'conversions_summary',
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
    settings = {
      sectionId: coerceSectionId(merged.sectionId),
      rangePreset:
        merged.rangePreset === 'last_7_days' || merged.rangePreset === 'last_90_days' || merged.rangePreset === 'last_28_days'
          ? merged.rangePreset
          : (defaults as { rangePreset: string }).rangePreset,
      compareToPrevious: typeof merged.compareToPrevious === 'boolean' ? merged.compareToPrevious : true,
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
      const modules = modulesFromLegacyReportSections(legacy)
      return {
        id: report.id,
        title: titleFallback,
        subtitle: undefined,
        internalNotes: undefined,
        theme: emptyBuilderModel(report.id, '').theme,
        pages: wrapFlatModulesInDocumentPages(modules),
      }
    }
    return emptyBuilderModel(report.id, titleFallback)
  }

  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title : titleFallback
  const subtitle = typeof raw.subtitle === 'string' ? raw.subtitle : undefined
  const internalNotes = typeof raw.internalNotes === 'string' ? raw.internalNotes : undefined
  const theme = reviveTheme(raw.theme)

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
    pages = wrapFlatModulesInDocumentPages(normalizeModuleOrders(modules))
  }
  if (pages.length === 0) {
    pages = createDefaultDocumentPages(title)
  }

  return {
    id: report.id,
    title,
    subtitle,
    internalNotes,
    theme,
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
