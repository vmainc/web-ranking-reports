import { describe, expect, it } from 'vitest'
import {
  createState,
  createEmailSendingState,
  verifyState,
  verifyStateDetailed,
  sanitizeReturnPath,
} from '~/server/utils/stateSign'

const SECRET = 'state-signing-secret-for-tests'

describe('stateSign email_sending', () => {
  it('creates and verifies email_sending state', () => {
    const state = createEmailSendingState(SECRET, {
      userId: 'user1',
      agencyOwnerId: 'owner1',
      returnPath: '/agency',
    })
    const payload = verifyState(SECRET, state)
    expect(payload).not.toBeNull()
    expect(payload!.mode).toBe('email_sending')
    expect(payload!.userId).toBe('user1')
    expect(payload!.agencyOwnerId).toBe('owner1')
    expect(payload!.returnPath).toBe('/agency')
    expect(payload!.siteId).toBe('')
  })

  it('rejects tampered state', () => {
    const state = createEmailSendingState(SECRET, {
      userId: 'user1',
      agencyOwnerId: 'owner1',
    })
    const tampered = state.slice(0, -4) + 'xxxx'
    expect(verifyState(SECRET, tampered)).toBeNull()
    expect(verifyStateDetailed(SECRET, tampered).ok).toBe(false)
  })

  it('still verifies site and account modes', () => {
    const site = createState(SECRET, 'site1', 'user1', 'dashboard', 'site')
    expect(verifyState(SECRET, site)?.siteId).toBe('site1')
    const account = createState(SECRET, '', 'user1', undefined, 'account')
    expect(verifyState(SECRET, account)?.mode).toBe('account')
  })

  it('sanitizes return paths', () => {
    expect(sanitizeReturnPath('/agency')).toBe('/agency')
    expect(sanitizeReturnPath('https://evil.com')).toBe('/agency')
    expect(sanitizeReturnPath('//evil.com')).toBe('/agency')
    expect(sanitizeReturnPath('../x')).toBe('/agency')
  })
})
