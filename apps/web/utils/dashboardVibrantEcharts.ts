/** Brand palette for dashboard charts (not default ECharts colors). */
export const DV = {
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  yellow: '#facc15',
  cyan: '#06b6d4',
  rose: '#fb7185',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  split: 'rgba(148, 163, 184, 0.14)',
} as const

export const vibrantPieColors = [DV.green, DV.blue, DV.purple, DV.yellow, DV.cyan, DV.rose] as const

export function vibrantChartBase() {
  return {
    backgroundColor: 'transparent' as const,
    textStyle: { color: DV.slate400 },
  }
}

export function vibrantCategoryAxis(data: string[], rotate = false) {
  return {
    type: 'category' as const,
    data,
    axisLabel: { fontSize: 10, color: DV.slate400, rotate },
    axisLine: { lineStyle: { color: DV.slate600 } },
  }
}

export function vibrantValueAxis(opts?: { min?: number; max?: number; axisLabelFormatter?: string }) {
  return {
    type: 'value' as const,
    min: opts?.min,
    max: opts?.max,
    axisLabel: {
      color: DV.slate400,
      fontSize: 10,
      ...(opts?.axisLabelFormatter ? { formatter: opts.axisLabelFormatter as string } : {}),
    },
    splitLine: { lineStyle: { color: DV.split } },
  }
}

export function vibrantLegendBottom(data: string[]) {
  return {
    data,
    bottom: 0,
    textStyle: { fontSize: 11, color: DV.slate400 },
  }
}
