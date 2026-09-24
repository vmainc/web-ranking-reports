import { describe, expect, it } from 'vitest'
import { parseBacklinksSnapshot } from '~/types/backlinks'

describe('parseBacklinksSnapshot', () => {
  it('accepts a stored profile and rejects anything else', () => {
    expect(parseBacklinksSnapshot({ target: 'example.com', fetchedAt: '2026-09-24' })?.target).toBe('example.com')
    expect(parseBacklinksSnapshot(null)).toBeNull()
    expect(parseBacklinksSnapshot({ fetchedAt: '2026-09-24' })).toBeNull()
  })
})
