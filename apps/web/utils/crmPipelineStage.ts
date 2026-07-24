export const CRM_PIPELINE_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const

export type CrmPipelineStageId = (typeof CRM_PIPELINE_STAGES)[number]

export interface CrmStageTheme {
  label: string
  header: string
  column: string
  cardAccent: string
  dot: string
  chip: string
}

export const CRM_STAGE_THEMES: Record<CrmPipelineStageId, CrmStageTheme> = {
  new: {
    label: 'New',
    header: 'border-sky-500/40 bg-gradient-to-r from-sky-500/20 to-sky-600/5',
    column: 'border-sky-500/20 bg-slate-900/50',
    cardAccent: 'border-l-sky-400',
    dot: 'bg-sky-400',
    chip: 'crm-stage-chip border-sky-500/35 bg-sky-500/15 text-sky-300',
  },
  contacted: {
    label: 'Contacted',
    header: 'border-violet-500/40 bg-gradient-to-r from-violet-500/20 to-violet-600/5',
    column: 'border-violet-500/20 bg-slate-900/50',
    cardAccent: 'border-l-violet-400',
    dot: 'bg-violet-400',
    chip: 'crm-stage-chip border-violet-500/35 bg-violet-500/15 text-violet-300',
  },
  qualified: {
    label: 'Qualified',
    header: 'border-indigo-500/40 bg-gradient-to-r from-indigo-500/20 to-indigo-600/5',
    column: 'border-indigo-500/20 bg-slate-900/50',
    cardAccent: 'border-l-indigo-400',
    dot: 'bg-indigo-400',
    chip: 'crm-stage-chip border-indigo-500/35 bg-indigo-500/15 text-indigo-300',
  },
  proposal: {
    label: 'Proposal',
    header: 'border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/5',
    column: 'border-amber-500/25 bg-slate-900/50',
    cardAccent: 'border-l-amber-400',
    dot: 'bg-amber-400',
    chip: 'crm-stage-chip border-amber-500/35 bg-amber-500/15 text-amber-300',
  },
  won: {
    label: 'Won',
    header: 'border-emerald-500/40 bg-gradient-to-r from-emerald-500/20 to-emerald-600/5',
    column: 'border-emerald-500/25 bg-slate-900/50',
    cardAccent: 'border-l-emerald-400',
    dot: 'bg-emerald-400',
    chip: 'crm-stage-chip border-emerald-500/35 bg-emerald-500/15 text-emerald-300',
  },
  lost: {
    label: 'Lost',
    header: 'border-rose-500/35 bg-gradient-to-r from-rose-500/15 to-slate-800/40',
    column: 'border-rose-500/20 bg-slate-900/40',
    cardAccent: 'border-l-rose-400/80',
    dot: 'bg-rose-400/90',
    chip: 'crm-stage-chip border-rose-500/30 bg-rose-500/10 text-rose-300',
  },
}

export function crmStageTheme(stage: string): CrmStageTheme {
  const id = stage as CrmPipelineStageId
  return CRM_STAGE_THEMES[id] ?? CRM_STAGE_THEMES.new
}

export function crmStageLabel(stage: string): string {
  return crmStageTheme(stage).label
}
