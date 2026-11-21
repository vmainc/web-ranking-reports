import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type PocketBase from 'pocketbase'
import { getClaudeConfig } from './claude'

describe('getClaudeConfig', () => {
  const origEnv = { ...process.env }

  beforeEach(() => {
    process.env.CLAUDE_API_KEY = 'env-key-should-not-win'
    process.env.CLAUDE_MODEL = 'claude-env-model'
  })

  afterEach(() => {
    process.env = { ...origEnv }
    vi.restoreAllMocks()
  })

  it('prefers PocketBase claude_api over env key', async () => {
    const pb = {
      collection: () => ({
        getFirstListItem: vi.fn().mockResolvedValue({
          value: { api_key: 'pb-key', model: 'claude-haiku-4-5' },
        }),
      }),
    } as unknown as PocketBase

    const cfg = await getClaudeConfig(pb)
    expect(cfg?.api_key).toBe('pb-key')
    expect(cfg?.model).toBe('claude-haiku-4-5')
  })

  it('falls back to env when PocketBase has no key', async () => {
    const pb = {
      collection: () => ({
        getFirstListItem: vi.fn().mockRejectedValue(new Error('not found')),
      }),
    } as unknown as PocketBase

    const cfg = await getClaudeConfig(pb)
    expect(cfg?.api_key).toBe('env-key-should-not-win')
  })
})