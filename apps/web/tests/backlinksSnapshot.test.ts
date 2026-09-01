import { describe, expect, it } from 'vitest'
import { isBacklinksProfile, parseBacklinksSnapshot } from '~/types/backlinks'

describe('backlinks snapshot parsing', () => {
  it('accepts profiles with fetchedAt', () => {
    const profile = {
      target: 'example.com',
      fetchedAt: '2026-09-01T12:00:00.000Z',
      summary: null,
      referringDomains: [],
      anchors: [],
      domainPages: [],
      sampleBacklinks: [],
    }
    expect(isBacklinksProfile(profile)).toBe(true)
    expect(parseBacklinksSnapshot(profile)?.fetchedAt).toBe(profile.fetchedAt)
  })

  it('rejects snapshots missing fetchedAt', () => {
    expect(
      isBacklinksProfile({
        target: 'example.com',
        summary: null,
        referringDomains: [],
        anchors: [],
        domainPages: [],
        sampleBacklinks: [],
      }),
    ).toBe(false)
  })
})
