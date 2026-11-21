import { describe, expect, it } from 'vitest'
import {
  mergeMetaAdAccounts,
  normalizeMetaAdAccountId,
  metaAdAccountActId,
  sumMetaAdsConversions,
  sumMetaAdsFollowers,
} from '~/server/utils/metaClient'

describe('Meta Ads helpers', () => {
  it('normalizes act_ prefixes', () => {
    expect(normalizeMetaAdAccountId('act_123')).toBe('123')
    expect(normalizeMetaAdAccountId('123')).toBe('123')
    expect(metaAdAccountActId('123')).toBe('act_123')
    expect(metaAdAccountActId('act_123')).toBe('act_123')
  })

  it('merges ad accounts by numeric id', () => {
    const merged = mergeMetaAdAccounts([
      [{ id: 'act_1', account_id: '1', name: 'A' }],
      [{ id: 'act_1', account_id: '1', name: 'A duplicate' }, { id: 'act_2', account_id: '2', name: 'B' }],
    ])
    expect(merged.map((a) => a.account_id).sort()).toEqual(['1', '2'])
    expect(merged.find((a) => a.account_id === '1')?.name).toBe('A')
  })

  it('sums lead and purchase actions as conversions', () => {
    expect(
      sumMetaAdsConversions([
        { action_type: 'link_click', value: '10' },
        { action_type: 'lead', value: '2' },
        { action_type: 'offsite_conversion.fb_pixel_purchase', value: '3' },
      ]),
    ).toBe(5)
    expect(sumMetaAdsConversions(undefined)).toBe(0)
  })

  it('counts followers from page likes or follows without double counting', () => {
    expect(sumMetaAdsFollowers([{ action_type: 'like', value: '7' }, { action_type: 'link_click', value: '40' }])).toBe(7)
    expect(sumMetaAdsFollowers([{ action_type: 'like', value: '7' }, { action_type: 'follow', value: '9' }])).toBe(9)
    expect(sumMetaAdsFollowers(undefined)).toBe(0)
  })
})
