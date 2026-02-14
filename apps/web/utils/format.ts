export function fmtNum(value: number): string {
  return new Intl.NumberFormat().format(value)
}

export function fmtPct(value: number, decimals = 1): string {
  return `${Number(value).toFixed(decimals)}%`
}

export function fmtCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

export function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return s ? `${m}m ${s}s` : `${m}m`
}
