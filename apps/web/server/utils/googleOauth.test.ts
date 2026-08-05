import { describe, expect, it } from 'vitest'
import { buildAuthUrl, getScopes, type GoogleOAuthSettings } from '~/server/utils/googleOauth'
import { GMAIL_SEND_SCOPES } from '~/server/services/email/agencyEmailIntegration'

const analyticsSettings: GoogleOAuthSettings = {
  client_id: 'analytics-client.apps.googleusercontent.com',
  client_secret: 'secret',
  redirect_uri: 'https://app.example.com/api/google/callback',
}

describe('buildAuthUrl — Analytics (legacy signature)', () => {
  it('matches prior Analytics authorize URL shape', () => {
    const url = buildAuthUrl(analyticsSettings, 'signed-state-abc', true)
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('client_id')).toBe(analyticsSettings.client_id)
    expect(parsed.searchParams.get('redirect_uri')).toBe(analyticsSettings.redirect_uri)
    expect(parsed.searchParams.get('state')).toBe('signed-state-abc')
    expect(parsed.searchParams.get('access_type')).toBe('offline')
    expect(parsed.searchParams.get('include_granted_scopes')).toBe('true')
    expect(parsed.searchParams.get('prompt')).toBe('consent')

    const scopes = (parsed.searchParams.get('scope') || '').split(' ')
    for (const required of getScopes(analyticsSettings)) {
      expect(scopes).toContain(required)
    }
    expect(scopes.join(' ')).not.toContain('gmail.send')
  })

  it('omits prompt when consent is not requested', () => {
    const url = buildAuthUrl(analyticsSettings, 'state-no-prompt', false)
    const parsed = new URL(url)
    expect(parsed.searchParams.get('prompt')).toBeNull()
    expect(parsed.searchParams.get('include_granted_scopes')).toBe('true')
    expect(parsed.searchParams.get('access_type')).toBe('offline')
  })
})

describe('buildAuthUrl — Gmail (options signature)', () => {
  it('builds Gmail authorize URL with offline access and no incremental scopes', () => {
    const url = buildAuthUrl({
      clientId: 'gmail-client.apps.googleusercontent.com',
      redirectUri: 'https://app.example.com/api/agency/email-sending/google/callback',
      scopes: [...GMAIL_SEND_SCOPES],
      state: 'email-sending-state',
      accessType: 'offline',
      includeGrantedScopes: false,
      prompt: 'consent',
    })
    const parsed = new URL(url)
    expect(parsed.searchParams.get('client_id')).toBe('gmail-client.apps.googleusercontent.com')
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      'https://app.example.com/api/agency/email-sending/google/callback',
    )
    expect(parsed.searchParams.get('state')).toBe('email-sending-state')
    expect(parsed.searchParams.get('access_type')).toBe('offline')
    expect(parsed.searchParams.get('include_granted_scopes')).toBe('false')
    expect(parsed.searchParams.get('prompt')).toBe('consent')

    const scopes = (parsed.searchParams.get('scope') || '').split(' ')
    expect(scopes).toEqual([...GMAIL_SEND_SCOPES])
    expect(scopes.join(' ')).not.toContain('analytics.readonly')
  })

  it('can omit prompt for reconnect when refresh token already exists', () => {
    const url = buildAuthUrl({
      clientId: 'gmail-client.apps.googleusercontent.com',
      redirectUri: 'https://app.example.com/api/agency/email-sending/google/callback',
      scopes: [...GMAIL_SEND_SCOPES],
      state: 'state',
      accessType: 'offline',
      includeGrantedScopes: false,
    })
    expect(new URL(url).searchParams.get('prompt')).toBeNull()
  })
})
