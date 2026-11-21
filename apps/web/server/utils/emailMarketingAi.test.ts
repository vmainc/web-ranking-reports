import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { ClaudeConfig } from './claude'
import { runEmailMarketingAi } from './emailMarketingAi'
import * as contentAi from './contentGeneratorAi'

const config: ClaudeConfig = { api_key: 'test-key', model: 'claude-haiku-4-5' }

describe('runEmailMarketingAi', () => {
  beforeEach(() => {
    vi.spyOn(contentAi, 'claudeTextCompletion')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses ideas JSON from Claude', async () => {
    vi.mocked(contentAi.claudeTextCompletion).mockResolvedValue(
      '{"ideas":["Q2 SEO wins","Re-engage past clients"]}',
    )
    const r = await runEmailMarketingAi(config, {
      task: 'ideas',
      campaignName: 'Spring',
      subject: '',
      bodyHtml: '',
    })
    expect(r.ideas).toEqual(['Q2 SEO wins', 'Re-engage past clients'])
  })

  it('extracts bodyHtml when JSON has escaped quotes', async () => {
    vi.mocked(contentAi.claudeTextCompletion).mockResolvedValue(
      String.raw`{"bodyHtml":"<p>Hi {{first_name}},</p><p><a href='https://example.com'>Click</a></p>"}`,
    )
    const r = await runEmailMarketingAi(config, {
      task: 'compose',
      campaignName: 'Test',
      subject: '',
      bodyHtml: '',
      brief: 'Short invite',
    })
    expect(r.bodyHtml).toContain('{{first_name}}')
    expect(r.bodyHtml).toContain('example.com')
  })
})