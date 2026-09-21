export interface CrmBoardListTheme {
  header: string
  column: string
  cardAccent: string
  dot: string
  chip: string
  count: string
}

const THEMES: CrmBoardListTheme[] = [
  {
    header: 'border-sky-500/40 bg-gradient-to-r from-sky-500/20 to-sky-600/5',
    column: 'border-sky-500/20 bg-slate-900/50',
    cardAccent: 'border-l-sky-400',
    dot: 'bg-sky-400',
    chip: 'border-sky-500/35 bg-sky-500/15 text-sky-300',
    count: 'text-slate-400',
  },
  {
    header: 'border-violet-500/40 bg-gradient-to-r from-violet-500/20 to-violet-600/5',
    column: 'border-violet-500/20 bg-slate-900/50',
    cardAccent: 'border-l-violet-400',
    dot: 'bg-violet-400',
    chip: 'border-violet-500/35 bg-violet-500/15 text-violet-300',
    count: 'text-slate-400',
  },
  {
    header: 'border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/5',
    column: 'border-amber-500/25 bg-slate-900/50',
    cardAccent: 'border-l-amber-400',
    dot: 'bg-amber-400',
    chip: 'border-amber-500/35 bg-amber-500/15 text-amber-300',
    count: 'text-amber-400/90',
  },
  {
    header: 'border-emerald-500/40 bg-gradient-to-r from-emerald-500/20 to-emerald-600/5',
    column: 'border-emerald-500/25 bg-slate-900/50',
    cardAccent: 'border-l-emerald-400',
    dot: 'bg-emerald-400',
    chip: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300',
    count: 'text-emerald-400/90',
  },
  {
    header: 'border-rose-500/35 bg-gradient-to-r from-rose-500/15 to-slate-800/40',
    column: 'border-rose-500/20 bg-slate-900/40',
    cardAccent: 'border-l-rose-400/80',
    dot: 'bg-rose-400/90',
    chip: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    count: 'text-rose-400/80',
  },
  {
    header: 'border-cyan-500/40 bg-gradient-to-r from-cyan-500/20 to-cyan-600/5',
    column: 'border-cyan-500/20 bg-slate-900/50',
    cardAccent: 'border-l-cyan-400',
    dot: 'bg-cyan-400',
    chip: 'border-cyan-500/35 bg-cyan-500/15 text-cyan-300',
    count: 'text-slate-400',
  },
]

export function crmBoardListTheme(index: number): CrmBoardListTheme {
  return THEMES[((index % THEMES.length) + THEMES.length) % THEMES.length]
}
