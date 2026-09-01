import { describe, expect, it } from 'vitest'
import type { AiVisibilityProfile } from '~/types/aiVisibility'
import { isAiVisibilityProfile, parseAiVisibilitySnapshot } from '~/types/aiVisibility'

describe('ai visibility types', () => {
  it('recognizes a valid profile shape', () => {
    const profile: AiVisibilityProfile = {
      target: 'example.com',
      fetchedAt: new Date().toISOString(),
      domain: {
        total: { mentions: 10, aiSearchVolume: 100 },
        google: { mentions: 6, aiSearchVolume: 60 },
        chatGpt: { mentions: 4, aiSearchVolume: 40 },
        topSourceDomains: [],
      },
      keywords: [],
    }
    expect(isAiVisibilityProfile(profile)).toBe(true)
    expect(parseAiVisibilitySnapshot(profile)?.target).toBe('example.com')
    expect(isAiVisibilityProfile(null)).toBe(false)
    expect(
      isAiVisibilityProfile({
        target: 'example.com',
        domain: { total: { mentions: 0, aiSearchVolume: 0 }, google: null, chatGpt: null, topSourceDomains: [] },
        keywords: [],
      }),
    ).toBe(false)
  })
})
