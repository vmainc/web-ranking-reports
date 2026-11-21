import { describe, expect, it } from 'vitest'
import { CRM_TAG_PREVIOUS_CLIENT, hasContactTag, toggleContactTag } from '~/utils/crmContactTags'

describe('crmContactTags', () => {
  it('toggles preset tag', () => {
    expect(toggleContactTag(['site audit'], CRM_TAG_PREVIOUS_CLIENT, true)).toEqual(['site audit', CRM_TAG_PREVIOUS_CLIENT])
    expect(toggleContactTag(['Previous client'], CRM_TAG_PREVIOUS_CLIENT, false)).toBeNull()
  })

  it('detects tag case-insensitively', () => {
    expect(hasContactTag(['previous client'], CRM_TAG_PREVIOUS_CLIENT)).toBe(true)
  })
})