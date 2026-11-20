import { describe, expect, it } from 'vitest'
import { personalizeCampaignHtml } from './campaignEmail'

describe('personalizeCampaignHtml', () => {
  it('replaces first_name and email merge tags', () => {
    const html = '<p>Hi {{first_name}}, we have {{email}} on file.</p>'
    const out = personalizeCampaignHtml(html, { name: 'Jane Doe', email: 'jane@example.com' })
    expect(out).toBe('<p>Hi Jane, we have jane@example.com on file.</p>')
  })

  it('is case-insensitive on tag names', () => {
    const out = personalizeCampaignHtml('{{EMAIL}}', { name: '', email: 'a@b.co' })
    expect(out).toBe('a@b.co')
  })
})