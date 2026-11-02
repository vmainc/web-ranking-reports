import { describe, expect, it } from 'vitest'
import { buildCompetitiveTalkingPoints } from './competitiveSnapshot'

describe('buildCompetitiveTalkingPoints', () => {
  it('highlights visibility gaps vs SERP leader', () => {
    const points = buildCompetitiveTalkingPoints(
      'prospect.com',
      [
        {
          keyword: 'commercial cleaning kansas city',
          searchVolume: 1200,
          prospectPosition: null,
          leader: { domain: 'competitor.com', position: 2 },
        },
      ],
      [{ domain: 'competitor.com', overlapCount: 1, sampleKeywords: ['commercial cleaning kansas city'] }],
    )
    expect(points[0]).toContain('competitor.com')
    expect(points[0]).toContain('top 10')
  })
})
