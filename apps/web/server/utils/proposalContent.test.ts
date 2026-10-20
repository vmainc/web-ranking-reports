import { describe, expect, it } from 'vitest'
import {
  calcProposalTotals,
  calcStoredProposalTotal,
  lineExtension,
  mergeLegacyProposalFields,
  normalizeProposalContent,
} from '~/utils/proposalContent'

describe('proposalContent totals', () => {
  it('computes one-time and recurring subtotals separately', () => {
    const lines = [
      { qty: 2, unit_price: 500, billing_interval: 'one_time' },
      { qty: 1, unit_price: 200, billing_interval: 'month' },
    ]
    const totals = calcProposalTotals(lines, {
      discount_type: null,
      discount_value: 0,
      discount_applies_to: 'one_time',
    })
    expect(totals.one_time_subtotal).toBe(1000)
    expect(totals.recurring).toHaveLength(1)
    expect(totals.recurring[0].subtotal).toBe(200)
    expect(
      calcStoredProposalTotal(lines, {
        discount_type: null,
        discount_value: 0,
        discount_applies_to: 'one_time',
      }),
    ).toBe(1000)
  })

  it('applies line and proposal discounts', () => {
    const lines = [
      {
        qty: 1,
        unit_price: 1000,
        billing_interval: 'one_time',
        metadata_json: { discount_percent: 10 },
      },
    ]
    const totals = calcProposalTotals(lines, {
      discount_type: 'percent',
      discount_value: 5,
      discount_applies_to: 'one_time',
    })
    expect(lineExtension(lines[0])).toBe(900)
    expect(totals.one_time_subtotal).toBe(900)
    expect(totals.one_time_discount).toBe(45)
    expect(totals.one_time_total).toBe(855)
  })

  it('merges legacy intro and terms into sections', () => {
    const content = mergeLegacyProposalFields(normalizeProposalContent(null), 'Hello intro', 'Terms here')
    const exec = content.sections.find((s) => s.key === 'executive_summary')
    const terms = content.sections.find((s) => s.key === 'terms_assumptions')
    expect(exec?.body).toBe('Hello intro')
    expect(terms?.body).toBe('Terms here')
  })
})
