import { describe, expect, it } from 'vitest'
import { aiDiscoverySummary, hasAiDiscoveryFile, reportBotRows } from '../utils/aiCrawlReport'

describe('aiCrawlReport', () => {
  it('treats llms.txt alone as success', () => {
    expect(hasAiDiscoveryFile(true, false)).toBe(true)
    const s = aiDiscoverySummary(true, false)
    expect(s.ok).toBe(true)
    expect(s.detail).toContain('llms.txt')
  })

  it('does not require llm.txt when llms.txt is missing', () => {
    const s = aiDiscoverySummary(false, false)
    expect(s.ok).toBe(false)
    expect(s.detail).not.toContain('llm.txt')
  })

  it('filters report bot rows to the public subset', () => {
    const rows = reportBotRows([
      { name: 'GPTBot', allowed: false },
      { name: 'CCBot', allowed: true },
    ])
    expect(rows.some((r) => r.name === 'GPTBot' && r.allowed === false)).toBe(true)
    expect(rows.some((r) => r.name === 'CCBot')).toBe(false)
    expect(rows.length).toBe(5)
  })
})