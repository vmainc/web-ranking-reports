import { describe, expect, it } from 'vitest'
import { buildProposalDeckFallback } from '~/lib/proposalDeck'
import { DECK_FIXED, finalizeDeckForEngagement } from '~/lib/proposalDeckTemplate'

describe('finalizeDeckForEngagement', () => {
  it('locks section titles and pillar count', () => {
    const raw = buildProposalDeckFallback({
      title: 'Test',
      client_name: 'Acme',
      currency: 'USD',
      items: [{ name: 'SEO', unit_price: 1000, billing_interval: 'month' }],
    })
    const deck = finalizeDeckForEngagement(raw, 'monthly_marketing', 'Acme')
    expect(deck.opportunity.title).toBe(DECK_FIXED.opportunityTitle)
    expect(deck.opportunity.pillars).toHaveLength(4)
    expect(deck.ninety_days.months).toHaveLength(3)
    expect(deck.ninety_days.months[0]?.label).toBe('MONTH 01')
    expect(deck.tagline).toBe(DECK_FIXED.tagline)
  })
})