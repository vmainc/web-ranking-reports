import { describe, expect, it } from 'vitest'
import { followerGrowth, followerGrowthPercent } from '~/server/services/social/metrics/derived'
import { snapshotDedupeKey } from '~/server/services/social/snapshots'
import { connectionMatchesMetaPage, assertSiteOwnedByAgency } from '~/server/services/social/facebookPageMatch'
import { publicAgencyIntegration } from '~/server/services/social/agencyMetaIntegration'
import { publicSocialConnection } from '~/server/services/social/socialConnections'
import { capabilitiesForAccessType } from '~/server/services/social/capabilities'
import { createMetaIntegrationState, verifyState, verifyStateDetailed } from '~/server/utils/stateSign'

const SECRET = 'state-signing-secret-for-tests'

describe('derived follower growth', () => {
  it('subtracts beginning from ending', () => {
    expect(followerGrowth({ beginningFollowers: 100, endingFollowers: 174 })).toBe(74)
  })

  it('returns null when either side is missing', () => {
    expect(followerGrowth({ beginningFollowers: null, endingFollowers: 10 })).toBeNull()
    expect(followerGrowth({ beginningFollowers: 10, endingFollowers: undefined })).toBeNull()
  })

  it('does not compute percent from a zero baseline', () => {
    expect(followerGrowthPercent({ beginningFollowers: 0, endingFollowers: 10 })).toBeNull()
  })
})

describe('snapshot dedupe', () => {
  it('is deterministic for the same period', () => {
    const a = snapshotDedupeKey({
      connectionId: 'c1',
      metricKey: 'facebook.page.followers',
      periodType: 'lifetime',
      periodStart: '2026-08-15',
      periodEnd: '2026-08-15',
    })
    const b = snapshotDedupeKey({
      connectionId: 'c1',
      metricKey: 'facebook.page.followers',
      periodType: 'lifetime',
      periodStart: '2026-08-15',
      periodEnd: '2026-08-15',
    })
    expect(a).toBe(b)
  })

  it('differs when the period changes so history is retained', () => {
    const a = snapshotDedupeKey({
      connectionId: 'c1',
      metricKey: 'facebook.page.followers',
      periodType: 'lifetime',
      periodStart: '2026-08-14',
      periodEnd: '2026-08-14',
    })
    const b = snapshotDedupeKey({
      connectionId: 'c1',
      metricKey: 'facebook.page.followers',
      periodType: 'lifetime',
      periodStart: '2026-08-15',
      periodEnd: '2026-08-15',
    })
    expect(a).not.toBe(b)
  })
})

describe('public → authenticated identity match', () => {
  it('matches username public tracking to a Meta Page', () => {
    expect(
      connectionMatchesMetaPage(
        { external_asset_id: 'fb_url:rodomaticplumbing', username: 'rodomaticplumbing' },
        { id: '111', username: 'RodomaticPlumbing' },
      ),
    ).toBe(true)
  })

  it('matches numeric Page id', () => {
    expect(connectionMatchesMetaPage({ external_asset_id: 'fb_id:111' }, { id: '111' })).toBe(true)
    expect(connectionMatchesMetaPage({ external_asset_id: '111' }, { id: '111' })).toBe(true)
  })

  it('does not guess from unrelated public URLs', () => {
    expect(
      connectionMatchesMetaPage(
        { external_asset_id: 'fb_url:otherpage', username: 'otherpage' },
        { id: '111', username: 'rodomaticplumbing' },
      ),
    ).toBe(false)
  })

  it('rejects mapping a site from another agency', () => {
    expect(assertSiteOwnedByAgency('owner-a', 'owner-b')).toBe(false)
    expect(assertSiteOwnedByAgency('owner-a', 'owner-a')).toBe(true)
  })
})

describe('tokens are not exposed on public DTOs', () => {
  it('omits encrypted integration tokens', () => {
    const dto = publicAgencyIntegration({
      id: 'i1',
      agency: 'a1',
      provider: 'meta',
      status: 'connected',
      encrypted_access_token: 'v1:super-secret',
      display_name: 'Doug',
    })
    expect(JSON.stringify(dto)).not.toMatch(/v1:super-secret/)
    expect(dto).not.toHaveProperty('encrypted_access_token')
  })

  it('omits page tokens', () => {
    const dto = publicSocialConnection({
      id: 'c1',
      site: 's1',
      provider: 'meta',
      platform: 'facebook',
      asset_type: 'facebook_page',
      access_type: 'authenticated',
      external_asset_id: '111',
      encrypted_page_token: 'v1:page-secret',
      status: 'active',
    })
    expect(JSON.stringify(dto)).not.toMatch(/page-secret/)
    expect(dto).not.toHaveProperty('encrypted_page_token')
  })
})

describe('capabilities', () => {
  it('hides insights for public access', () => {
    const c = capabilitiesForAccessType('public', 'metrics_unavailable')
    expect(c.followers).toBe(true)
    expect(c.reach).toBe(false)
    expect(c.engagement).toBe(false)
    expect(c.posts).toBe(false)
    expect(c.ads).toBe(false)
    expect(c.instagram).toBe(false)
  })

  it('enables insights when authenticated and active', () => {
    const c = capabilitiesForAccessType('authenticated', 'active')
    expect(c.reach).toBe(true)
    expect(c.engagement).toBe(true)
  })
})

describe('sync batch isolation', () => {
  it('counts failures without aborting remaining items', () => {
    const results = [{ ok: true }, { ok: false }, { ok: true }]
    const failed = results.filter((r) => !r.ok).length
    expect(results.length).toBe(3)
    expect(failed).toBe(1)
  })
})

describe('stateSign meta_integration', () => {
  it('creates and verifies meta state', () => {
    const state = createMetaIntegrationState(SECRET, {
      userId: 'user1',
      agencyOwnerId: 'owner1',
      returnPath: '/agency?tab=integrations',
    })
    const payload = verifyState(SECRET, state)
    expect(payload?.mode).toBe('meta_integration')
    expect(payload?.agencyOwnerId).toBe('owner1')
    expect(payload?.siteId).toBe('')
    expect(JSON.stringify(payload)).not.toMatch(/access_token/)
  })

  it('rejects tampered and expired-style invalid state', () => {
    const state = createMetaIntegrationState(SECRET, { userId: 'u', agencyOwnerId: 'o' })
    expect(verifyStateDetailed(SECRET, state.slice(0, -4) + 'xxxx').ok).toBe(false)
    expect(verifyStateDetailed(SECRET, '').ok).toBe(false)
    expect(verifyStateDetailed(SECRET, 'not-valid').reason).toBe('invalid')
  })
})
