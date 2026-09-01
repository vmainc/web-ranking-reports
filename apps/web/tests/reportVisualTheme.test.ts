import { describe, expect, it } from 'vitest'
import {
  hexToRgba,
  reportAreaGradientStops,
  reportChartBase,
  reportSeriesPalette,
} from '~/utils/reportVisualTheme'

describe('reportVisualTheme', () => {
  it('converts hex colors to rgba with alpha', () => {
    expect(hexToRgba('#2563eb', 0.22)).toBe('rgba(37, 99, 235, 0.22)')
    expect(hexToRgba('#16a34a', 1)).toBe('rgba(22, 163, 74, 1)')
    expect(hexToRgba('#abc', 0.5)).toBe('rgba(170, 187, 204, 0.5)')
  })

  it('falls back for invalid hex', () => {
    expect(hexToRgba('not-a-color', 0.1)).toBe('rgba(37, 99, 235, 0.1)')
  })

  it('builds a print-safe light chart palette with brand + support colors', () => {
    const palette = reportSeriesPalette()
    expect(palette).toHaveLength(6)
    expect(palette[0]).toMatch(/^#/)
    expect(palette.slice(2)).toEqual(['#16a34a', '#7c3aed', '#0891b2', '#e11d48'])
  })

  it('uses dark axis-friendly text in the base chart theme', () => {
    const base = reportChartBase()
    expect(base.backgroundColor).toBe('transparent')
    expect(base.textStyle.color).toBe('#64748b')
  })

  it('builds a fading area fill from the brand hex', () => {
    const stops = reportAreaGradientStops('#2563eb')
    expect(stops[0]).toEqual({ offset: 0, color: 'rgba(37, 99, 235, 0.22)' })
    expect(stops[1]).toEqual({ offset: 1, color: 'rgba(37, 99, 235, 0.02)' })
  })
})
