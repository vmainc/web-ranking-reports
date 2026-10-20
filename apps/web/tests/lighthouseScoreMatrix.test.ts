import { describe, expect, it } from 'vitest'
import {
  formatLighthouseScore,
  lighthouseGaugeStrokeOffset,
  lighthouseScorePalette,
  lighthouseScoreTone,
  lighthouseScoresSummary,
} from '../utils/lighthouseScoreMatrix'

describe('lighthouseScoreMatrix', () => {
  it('formats missing scores', () => {
    expect(formatLighthouseScore(null)).toBe('—')
    expect(formatLighthouseScore(88)).toBe('88')
  })

  it('uses PageSpeed-style tones and colors', () => {
    expect(lighthouseScoreTone(92)).toBe('good')
    expect(lighthouseScoreTone(72)).toBe('mid')
    expect(lighthouseScoreTone(40)).toBe('low')
    expect(lighthouseScorePalette('good').ring).toBe('#0cce6b')
    expect(lighthouseScorePalette('low').ring).toBe('#ff4e42')
  })

  it('computes gauge stroke offset', () => {
    const full = lighthouseGaugeStrokeOffset(0)
    const half = lighthouseGaugeStrokeOffset(50)
    expect(half).toBeLessThan(full)
    expect(lighthouseGaugeStrokeOffset(100)).toBe(0)
  })

  it('summarizes mobile and desktop categories', () => {
    const s = lighthouseScoresSummary(
      { performance: 80, seo: 90, accessibility: 85, bestPractices: 100 },
      { performance: 95, seo: 92, accessibility: 88, bestPractices: 96 },
    )
    expect(s).toContain('Mobile:')
    expect(s).toContain('Perf 80')
    expect(s).toContain('A11y 85')
    expect(s).toContain('Desktop:')
    expect(s).toContain('BP 96')
  })
})
