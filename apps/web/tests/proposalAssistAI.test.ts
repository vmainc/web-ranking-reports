import { describe, expect, it } from 'vitest'
import { parseProposalAssistJson } from '~/server/utils/proposalAssistAI'

describe('parseProposalAssistJson', () => {
  it('parses fenced JSON from Claude', () => {
    const raw =
      '```json\n{"title":"Growth plan","intro_html":"Hello","terms_html":"Net 30","line_items":[{"sku":"vma-growth","name":"Growth","description":"SEO scope","unit_price":3000,"billing_interval":"month"}],"rationale":"Good fit"}\n```'
    const out = parseProposalAssistJson(raw)
    expect(out.title).toBe('Growth plan')
    expect(out.line_items[0]?.unit_price).toBe(3000)
  })
})