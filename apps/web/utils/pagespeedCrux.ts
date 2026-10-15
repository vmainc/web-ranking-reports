/**
 * Shared CrUX / PageSpeed field-data display helpers (client-safe).
 */

export type CruxCategory = 'FAST' | 'AVERAGE' | 'SLOW'

export type CruxMetricSummary = {
  id: string
  label: string
  percentile: number | null
  displayValue: string | null
  category: CruxCategory | null
}

export type CruxExperienceSummary = {
  id?: string
  overallCategory: CruxCategory | null
  metrics: CruxMetricSummary[]
}

export function cruxCategoryLabel(category: CruxCategory | null | undefined): string {
  if (category === 'FAST') return 'Good'
  if (category === 'AVERAGE') return 'Needs improvement'
  if (category === 'SLOW') return 'Poor'
  return 'No data'
}

export function cruxCategoryTone(category: CruxCategory | null | undefined): string {
  if (category === 'FAST') return 'text-emerald-300'
  if (category === 'AVERAGE') return 'text-amber-300'
  if (category === 'SLOW') return 'text-rose-300'
  return 'text-slate-400'
}

export function cruxCategoryChip(category: CruxCategory | null | undefined): string {
  if (category === 'FAST') return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
  if (category === 'AVERAGE') return 'border-amber-500/40 bg-amber-500/15 text-amber-200'
  if (category === 'SLOW') return 'border-rose-500/40 bg-rose-500/15 text-rose-200'
  return 'border-slate-600 bg-slate-800/60 text-slate-400'
}

/** Prefer URL-level CrUX; fall back to origin-level. */
export function pickCruxExperience(report: {
  fieldData?: CruxExperienceSummary | null
  originFieldData?: CruxExperienceSummary | null
} | null | undefined): { experience: CruxExperienceSummary; scope: 'url' | 'origin' } | null {
  if (report?.fieldData?.metrics?.length) return { experience: report.fieldData, scope: 'url' }
  if (report?.originFieldData?.metrics?.length) return { experience: report.originFieldData, scope: 'origin' }
  if (report?.fieldData?.overallCategory) return { experience: report.fieldData, scope: 'url' }
  if (report?.originFieldData?.overallCategory) return { experience: report.originFieldData, scope: 'origin' }
  return null
}
