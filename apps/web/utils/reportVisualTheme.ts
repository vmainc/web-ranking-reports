/**
 * Print-safe chart/visual helpers for report builder modules.
 * White canvas + agency --report-* colors + support colors inspired by the analytics dashboard.
 */

export const REPORT_SUPPORT = {
  green: '#16a34a',
  purple: '#7c3aed',
  cyan: '#0891b2',
  rose: '#e11d48',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  compare: '#94a3b8',
  split: 'rgba(148, 163, 184, 0.35)',
} as const

const FALLBACK_PRIMARY = '#2563eb'
const FALLBACK_ACCENT = '#1d4ed8'

export function readReportCssColor(
  varName: '--report-primary' | '--report-accent' | '--report-text' | '--report-surface',
  fallback: string,
  el?: HTMLElement | null,
): string {
  if (typeof window === 'undefined') return fallback
  const target = el ?? document.querySelector('.report-document') ?? document.documentElement
  const raw = getComputedStyle(target as Element).getPropertyValue(varName).trim()
  return raw || fallback
}

export function reportBrandColors(el?: HTMLElement | null) {
  return {
    primary: readReportCssColor('--report-primary', FALLBACK_PRIMARY, el),
    accent: readReportCssColor('--report-accent', FALLBACK_ACCENT, el),
  }
}

/** Hex (#rgb / #rrggbb) → rgba() string. Falls back to opaque primary-ish blue. */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.trim().replace('#', '')
  let r = 37
  let g = 99
  let b = 235
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    r = parseInt(h[0]! + h[0]!, 16)
    g = parseInt(h[1]! + h[1]!, 16)
    b = parseInt(h[2]! + h[2]!, 16)
  } else if (/^[0-9a-fA-F]{6}$/.test(h)) {
    r = parseInt(h.slice(0, 2), 16)
    g = parseInt(h.slice(2, 4), 16)
    b = parseInt(h.slice(4, 6), 16)
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function reportSeriesPalette(el?: HTMLElement | null): string[] {
  const { primary, accent } = reportBrandColors(el)
  return [primary, accent, REPORT_SUPPORT.green, REPORT_SUPPORT.purple, REPORT_SUPPORT.cyan, REPORT_SUPPORT.rose]
}

export function reportChartBase() {
  return {
    backgroundColor: 'transparent' as const,
    textStyle: { fontFamily: 'inherit', color: REPORT_SUPPORT.slate500 },
  }
}

export function reportCategoryAxis(data: string[], opts?: { rotate?: boolean | number }) {
  const rotate = opts?.rotate === true ? 32 : typeof opts?.rotate === 'number' ? opts.rotate : 0
  return {
    type: 'category' as const,
    boundaryGap: false as const,
    data,
    axisLabel: { fontSize: 10, color: REPORT_SUPPORT.slate500, rotate },
    axisLine: { lineStyle: { color: REPORT_SUPPORT.slate200 } },
  }
}

export function reportValueAxis(opts?: {
  name?: string
  min?: number
  max?: number
  minInterval?: number
  axisLabelFormatter?: string
}) {
  return {
    type: 'value' as const,
    name: opts?.name,
    min: opts?.min,
    max: opts?.max,
    minInterval: opts?.minInterval,
    nameTextStyle: { fontSize: 11, color: REPORT_SUPPORT.slate500, padding: [0, 0, 0, 4] as [number, number, number, number] },
    axisLabel: {
      color: REPORT_SUPPORT.slate500,
      fontSize: 10,
      ...(opts?.axisLabelFormatter ? { formatter: opts.axisLabelFormatter } : {}),
    },
    splitLine: { lineStyle: { color: REPORT_SUPPORT.slate100, type: 'dashed' as const } },
  }
}

export function reportLegendBottom(data: string[]) {
  return {
    data,
    bottom: 4,
    textStyle: { fontSize: 11, color: REPORT_SUPPORT.slate500 },
  }
}

export function reportAreaGradientStops(primaryHex: string) {
  return [
    { offset: 0, color: hexToRgba(primaryHex, 0.22) },
    { offset: 1, color: hexToRgba(primaryHex, 0.02) },
  ]
}
