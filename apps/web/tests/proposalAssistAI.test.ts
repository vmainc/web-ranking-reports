import { describe, expect, it } from 'vitest'
import { parseProposalAssistJson } from '~/server/utils/proposalAssistAI'

describe('parseProposalAssistJson', () => {
  it('parses fenced JSON from Claude', () => {
    const raw = '```json\n{"title":"Growth plan","intro_html":"Hello","terms_html":"Net 30","recommended_package_skus":["vma-growth"],"rationale":"Good fit"}\n```'
    const out = parseProposalAssistJson(raw)
    expect(out.title).toBe('Growth plan')
    expect(out.recommended_package_skus).toEqual(['vma-growth'])
  })
})