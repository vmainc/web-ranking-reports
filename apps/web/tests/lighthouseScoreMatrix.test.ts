import { describe, expect, it } from 'vitest'
import { lighthouseScoresSummary, formatLighthouseScore } from '../utils/lighthouseScoreMatrix'

describe('lighthouseScoreMatrix', () => {
  it('formats missing scores', () => {
    expect(formatLighthouseScore(null)).toBe('—')
    expect(formatLighthouseScore(88)).toBe('88')
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
