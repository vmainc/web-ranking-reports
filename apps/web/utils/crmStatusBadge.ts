/** Status pill classes readable on dashboard-vibrant (dark) backgrounds. */
export function crmClientStatusClass(status: string): string {
  switch (status) {
    case 'client':
      return 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
    case 'lead':
      return 'border border-amber-500/40 bg-amber-500/20 text-amber-300'
    case 'archived':
      return 'border border-slate-600 bg-slate-800/80 text-slate-400'
    default:
      return 'border border-slate-600 bg-slate-800/80 text-slate-400'
  }
}

export function crmClientStatusLabel(status: string): string {
  return status === 'client' ? 'Customer' : status
}
