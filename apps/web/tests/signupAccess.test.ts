import { describe, expect, it } from 'vitest'
import { signupHrefForConfig } from '~/utils/signupAccess'

describe('signupAccess', () => {
  it('routes to register when enabled', () => {
    expect(signupHrefForConfig(true)).toBe('/auth/register')
    expect(signupHrefForConfig(true, 'starter')).toBe('/auth/register?plan=starter')
  })

  it('routes to contact when disabled', () => {
    expect(signupHrefForConfig(false)).toBe('/contact')
    expect(signupHrefForConfig(false, 'growth')).toBe('/contact?plan=growth')
  })
})
