import type { Report } from '~/types'
import type { ReportBuilderModel, ReportModule, ReportModuleType } from '~/types/reportBuilder'
import { REPORT_BUILDER_PAYLOAD_KEY } from '~/types/reportBuilder'
import { REPORT_SECTION_IDS, type ReportSectionId } from '~/utils/reportLayoutPresets'
import { emptyBuilderModel, defaultSettingsForType, newModuleId, normalizeModuleOrders, createModule } from '~/utils/reportBuilderFactory'

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function coerceType(t: unknown): ReportModuleType | null {
  const allowed: ReportModuleType[] = [
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

  return { id, type, title, order, settings } as ReportModule
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

/**
 * Hydrates a persisted `payload_json.reportBuilder` blob (or returns a fresh model).
 */
export function hydrateReportBuilder(report: Report & { payload_json?: Record<string, unknown> }): ReportBuilderModel {
  const nameFromPayload =
    typeof report.payload_json?.name === 'string' ? (report.payload_json.name as string).trim() : ''
  const titleFallback = nameFromPayload || `Report ${report.id.slice(0, 8)}`

  const raw = report.payload_json?.[REPORT_BUILDER_PAYLOAD_KEY]
  if (!isRecord(raw)) {
    const fresh = emptyBuilderModel(report.id, titleFallback)
    /** First open of a report without saved builder state — show a polished demo stack. */
    fresh.modules = normalizeModuleOrders([createModule('traffic_overview', 0), createModule('keyword_rankings', 1)])
    return fresh
  }

  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title : titleFallback
  const subtitle = typeof raw.subtitle === 'string' ? raw.subtitle : undefined
  const internalNotes = typeof raw.internalNotes === 'string' ? raw.internalNotes : undefined
  const theme = reviveTheme(raw.theme)

  let modules: ReportModule[] = []
  if (Array.isArray(raw.modules)) {
    modules = raw.modules
      .map((row, i) => reviveModule(row, i))
      .filter((m): m is ReportModule => m !== null)
    modules = normalizeModuleOrders(modules)
  }

  return {
    id: report.id,
    title,
    subtitle,
    internalNotes,
    theme,
    modules,
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
      modules: model.modules.map((m) => ({
        id: m.id,
        type: m.type,
        title: m.title,
        order: m.order,
        layoutWidth: m.layoutWidth,
        settings: m.settings,
      })),
    },
    /** Keep list + PDF naming in sync with builder title. */
    name: model.title,
  }
}
