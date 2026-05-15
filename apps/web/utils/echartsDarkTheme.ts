/** Shared ECharts styling for dark integration dashboards. */

type AxisOption = Record<string, unknown>

function styleAxis(axis: unknown): unknown {
  if (!axis) return axis
  if (Array.isArray(axis)) return axis.map((a) => styleAxisSingle(a as AxisOption))
  return styleAxisSingle(axis as AxisOption)
}

function styleAxisSingle(axis: AxisOption): AxisOption {
  const type = axis.type as string | undefined
  const isValue = type === 'value' || type === undefined
  return {
    ...axis,
    axisLine: axis.axisLine ?? (isValue ? { show: false } : { lineStyle: { color: '#475569' } }),
    axisLabel: { color: '#94a3b8', fontSize: 11, ...(axis.axisLabel as object) },
    nameTextStyle: { color: '#94a3b8', ...(axis.nameTextStyle as object) },
    splitLine:
      isValue
        ? { lineStyle: { color: 'rgba(71, 85, 105, 0.35)' }, ...(axis.splitLine as object) }
        : axis.splitLine,
  }
}

export function withDarkChartOption<T extends Record<string, unknown>>(option: T): T {
  const legend = option.legend
  let styledLegend = legend
  if (legend && !Array.isArray(legend)) {
    styledLegend = { textStyle: { color: '#94a3b8' }, ...(legend as object) }
  }

  return {
    backgroundColor: 'transparent',
    textStyle: { color: '#94a3b8' },
    ...option,
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#475569',
      textStyle: { color: '#e2e8f0' },
      ...(option.tooltip as object),
    },
    legend: styledLegend,
    xAxis: styleAxis(option.xAxis),
    yAxis: styleAxis(option.yAxis),
  } as T
}
