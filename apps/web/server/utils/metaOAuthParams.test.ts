import { describe, expect, it } from 'vitest'
import {
  collectMetaOAuthParams,
  hasMetaOAuthError,
  isMetaOAuthDenied,
  metaOAuthHashRecoveryHtml,
  singleOAuthParam,
} from './metaOAuthParams'

describe('collectMetaOAuthParams', () => {
  it('reads code and state from query', () => {
    const p = collectMetaOAuthParams({ code: 'abc', state: 'xyz' })
    expect(p.code).toBe('abc')
    expect(p.state).toBe('xyz')
    expect(p.keys).toEqual(['code', 'state'])
    expect(hasMetaOAuthError(p)).toBe(false)
  })

  it('prefers query over body and accepts Facebook error_code without error', () => {
    const p = collectMetaOAuthParams(
      { error_code: '1349125', error_message: 'Cannot load URL' },
      { code: 'from-body' },
    )
    expect(p.errorCode).toBe('1349125')
    expect(p.code).toBe('from-body')
    expect(hasMetaOAuthError(p)).toBe(true)
    expect(isMetaOAuthDenied(p)).toBe(false)
  })

  it('detects access_denied', () => {
    const p = collectMetaOAuthParams({ error: 'access_denied', error_reason: 'user_denied' })
    expect(isMetaOAuthDenied(p)).toBe(true)
  })

  it('reads access_token from POST body only, never from the query string', () => {
    const fromQuery = collectMetaOAuthParams({ access_token: 'should-ignore', state: 's' })
    expect(fromQuery.accessToken).toBe('')
    const fromBody = collectMetaOAuthParams({ state: 's' }, { access_token: 'tok', state: 's' })
    expect(fromBody.accessToken).toBe('tok')
  })

  it('flattens array query values', () => {
    expect(singleOAuthParam(['first', 'second'])).toBe('first')
  })
})

describe('metaOAuthHashRecoveryHtml', () => {
  it('does not embed raw HTML from the agency URL', () => {
    const html = metaOAuthHashRecoveryHtml('/agency?tab=integrations&meta=missing_params')
    expect(html).toContain('URLSearchParams')
    expect(html).not.toContain('<script src=')
    expect(html).toContain('/agency?tab=integrations&meta=missing_params')
  })

  it('POSTs implicit access_token instead of putting it on the query string', () => {
    const html = metaOAuthHashRecoveryHtml('/agency?tab=integrations&meta=missing_params')
    expect(html).toContain("form.method = 'POST'")
    expect(html).toContain("add('access_token', token)")
    expect(html).toContain("if (key === 'access_token' || key === 'token') return")
  })
})
