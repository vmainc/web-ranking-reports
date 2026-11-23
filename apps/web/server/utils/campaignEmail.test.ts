import { describe, expect, it } from 'vitest'
import { appendCampaignFooterHtml } from '~/server/utils/campaignEmail'

describe('appendCampaignFooterHtml', () => {
  it('returns body unchanged when footer is empty', () => {
    expect(appendCampaignFooterHtml('<p>Hi</p>', '')).toBe('<p>Hi</p>')
  })

  it('appends footer HTML', () => {
    expect(appendCampaignFooterHtml('<p>Hi</p>', '<p>Footer</p>')).toBe('<p>Hi</p>\n<p>Footer</p>')
  })
})